import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { Industry } from '../config/industries';
import { IndustryTemplate, PROGRAM_TEMPLATES, getTemplate } from '../config/programTemplates';

const Decimal = Prisma.Decimal;

export interface TemplateSelection {
  key: string;
  price?: number;
  name?: string;
  description?: string;
}

export interface ApplyTemplateInput {
  organization: { id: string; industry: string | null; classBookingEnabled: boolean };
  userId: string;
  industry: Industry;
  selections: TemplateSelection[];
}

export interface SkippedProgram {
  key: string;
  name: string;
  reason: 'already_exists';
}

class ProgramTemplateService {
  /** The org's own industry template if set, otherwise every template so the owner can choose. */
  getTemplates(industry: string | null): { industry: string | null; templates: IndustryTemplate[] } {
    const own = industry ? getTemplate(industry) : undefined;
    return { industry: own ? industry : null, templates: own ? [own] : PROGRAM_TEMPLATES };
  }

  async applyTemplate({ organization, userId, industry, selections }: ApplyTemplateInput) {
    const template = getTemplate(industry);
    if (!template) throw new AppError(400, `No template for industry "${industry}"`);

    const seen = new Set<string>();
    const chosen = selections.map((selection) => {
      if (seen.has(selection.key)) throw new AppError(400, `Duplicate template program "${selection.key}"`);
      seen.add(selection.key);

      const program = template.programs.find((p) => p.key === selection.key);
      if (!program) throw new AppError(400, `Unknown template program "${selection.key}"`);

      return {
        key: program.key,
        program,
        name: selection.name ?? program.name,
        description: selection.description ?? program.description,
        price: selection.price ?? program.suggestedPrice,
      };
    });

    return prisma.$transaction(async (tx) => {
      const existing = await tx.program.findMany({
        where: { organizationId: organization.id },
        select: { name: true },
      });
      const takenNames = new Set(existing.map((p) => p.name.trim().toLowerCase()));

      const created = [];
      const skipped: SkippedProgram[] = [];
      let droppedMaxClasses = false;

      for (const item of chosen) {
        const nameKey = item.name.trim().toLowerCase();
        if (takenNames.has(nameKey)) {
          skipped.push({ key: item.key, name: item.name, reason: 'already_exists' });
          continue;
        }
        takenNames.add(nameKey);

        const wantsMaxClasses = item.program.maxClasses !== undefined;
        const applyMaxClasses = wantsMaxClasses && organization.classBookingEnabled;
        if (wantsMaxClasses && !applyMaxClasses) droppedMaxClasses = true;

        created.push(
          await tx.program.create({
            data: {
              organizationId: organization.id,
              name: item.name,
              description: item.description,
              price: new Decimal(item.price),
              billingFrequency: item.program.billingFrequency,
              ...(applyMaxClasses && { maxClasses: item.program.maxClasses }),
              ...(item.program.maxBillingCycles !== undefined && { maxBillingCycles: item.program.maxBillingCycles }),
              isActive: false,
              allowSelfEnrollment: false,
            },
          })
        );
      }

      if (!organization.industry) {
        await tx.organization.update({ where: { id: organization.id }, data: { industry } });
      }

      await tx.auditLog.create({
        data: {
          organizationId: organization.id,
          userId,
          action: 'PROGRAM_TEMPLATE_APPLIED',
          metadata: {
            industry,
            programIds: created.map((p) => p.id),
            skipped: skipped.map((s) => s.key),
          },
        },
      });

      return { created, skipped, classBookingOff: droppedMaxClasses };
    });
  }
}

export default new ProgramTemplateService();
