import prisma from '../config/database';

export type CreateFeedbackInput = {
  organizationId: string;
  contactId?: string;
  name: string;
  email?: string;
  type: 'feedback' | 'bug' | 'question';
  subject: string;
  message: string;
};

export type FeedbackFilters = {
  status?: string;
  type?: string;
  page?: number;
  limit?: number;
};

const feedbackService = {
  async create(input: CreateFeedbackInput) {
    return prisma.feedbackSubmission.create({
      data: {
        organizationId: input.organizationId,
        contactId: input.contactId,
        name: input.name,
        email: input.email,
        type: input.type,
        subject: input.subject,
        message: input.message,
      },
      include: { contact: { select: { id: true, firstName: true, lastName: true } } },
    });
  },

  async list(organizationId: string, filters: FeedbackFilters = {}) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      organizationId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.type ? { type: filters.type } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.feedbackSubmission.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { contact: { select: { id: true, firstName: true, lastName: true } } },
      }),
      prisma.feedbackSubmission.count({ where }),
    ]);

    return { items, total, page, limit };
  },

  async getById(id: string, organizationId: string) {
    const submission = await prisma.feedbackSubmission.findFirst({
      where: { id, organizationId },
      include: { contact: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (!submission) throw new Error('Feedback submission not found');
    return submission;
  },

  async updateStatus(id: string, _organizationId: string, status: string) {
    return prisma.feedbackSubmission.update({
      where: { id },
      data: { status },
      include: { contact: { select: { id: true, firstName: true, lastName: true } } },
    });
  },
};

export default feedbackService;
