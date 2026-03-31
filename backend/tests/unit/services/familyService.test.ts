import familyService from '../../../src/services/familyService';
import prisma from '../../../src/config/database';

const mockFamily = (overrides = {}) => ({
  id: 'fam-1',
  organizationId: 'org-1',
  name: 'Smith Family',
  billingEmail: null,
  helcimToken: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  contacts: [],
  invoices: [],
  ...overrides,
});

describe('FamilyService', () => {
  describe('createFamily', () => {
    it('creates and returns a family with contacts', async () => {
      const created = mockFamily();
      (prisma.family.create as jest.Mock).mockResolvedValue(created);

      const result = await familyService.createFamily({
        organizationId: 'org-1',
        name: 'Smith Family',
      });

      expect(prisma.family.create as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'Smith Family', organizationId: 'org-1' }),
        }),
      );
      expect(result.id).toBe('fam-1');
    });

    it('includes billingEmail when provided', async () => {
      (prisma.family.create as jest.Mock).mockResolvedValue(mockFamily({ billingEmail: 'billing@smith.com' }));

      await familyService.createFamily({
        organizationId: 'org-1',
        name: 'Smith Family',
        billingEmail: 'billing@smith.com',
      });

      expect(prisma.family.create as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ billingEmail: 'billing@smith.com' }),
        }),
      );
    });
  });

  describe('getFamilies', () => {
    it('returns paginated families with metadata', async () => {
      (prisma.family.findMany as jest.Mock).mockResolvedValue([mockFamily()]);
      (prisma.family.count as jest.Mock).mockResolvedValue(1);

      const result = await familyService.getFamilies('org-1');

      expect(result.families).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('calculates totalPages correctly', async () => {
      (prisma.family.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.family.count as jest.Mock).mockResolvedValue(25);

      const result = await familyService.getFamilies('org-1', 1, 10);

      expect(result.totalPages).toBe(3);
    });

    it('calculates skip correctly from page and limit', async () => {
      (prisma.family.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.family.count as jest.Mock).mockResolvedValue(0);

      await familyService.getFamilies('org-1', 3, 10);

      const call = (prisma.family.findMany as jest.Mock).mock.calls[0][0];
      expect(call.skip).toBe(20);
    });

    it('scopes by organizationId', async () => {
      (prisma.family.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.family.count as jest.Mock).mockResolvedValue(0);

      await familyService.getFamilies('org-1');

      const call = (prisma.family.findMany as jest.Mock).mock.calls[0][0];
      expect(call.where.organizationId).toBe('org-1');
    });
  });

  describe('getFamilyById', () => {
    it('returns family when found', async () => {
      (prisma.family.findFirst as jest.Mock).mockResolvedValue(mockFamily());

      const result = await familyService.getFamilyById('fam-1', 'org-1');

      expect(result.id).toBe('fam-1');
      expect(prisma.family.findFirst as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'fam-1', organizationId: 'org-1' } }),
      );
    });

    it('throws 404 when family is not found', async () => {
      (prisma.family.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(familyService.getFamilyById('missing', 'org-1')).rejects.toMatchObject({
        statusCode: 404,
        message: 'Family not found',
      });
    });

    it('scopes the lookup by organizationId', async () => {
      (prisma.family.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(familyService.getFamilyById('fam-1', 'org-2')).rejects.toMatchObject({ statusCode: 404 });

      const call = (prisma.family.findFirst as jest.Mock).mock.calls[0][0];
      expect(call.where.organizationId).toBe('org-2');
    });
  });

  describe('updateFamily', () => {
    it('updates and returns the family', async () => {
      (prisma.family.findFirst as jest.Mock).mockResolvedValue(mockFamily());
      const updated = mockFamily({ name: 'Jones Family' });
      (prisma.family.update as jest.Mock).mockResolvedValue(updated);

      const result = await familyService.updateFamily('fam-1', 'org-1', { name: 'Jones Family' });

      expect(prisma.family.update as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'fam-1' },
          data: { name: 'Jones Family', billingEmail: undefined },
        }),
      );
      expect(result.name).toBe('Jones Family');
    });

    it('throws 404 if family is not found', async () => {
      (prisma.family.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(familyService.updateFamily('missing', 'org-1', {})).rejects.toMatchObject({ statusCode: 404 });
      expect(prisma.family.update as jest.Mock).not.toHaveBeenCalled();
    });
  });

  describe('deleteFamily', () => {
    it('throws 400 if family has contacts', async () => {
      (prisma.family.findFirst as jest.Mock).mockResolvedValue(
        mockFamily({ contacts: [{ id: 'contact-1' }] }),
      );

      await expect(familyService.deleteFamily('fam-1', 'org-1')).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('contacts'),
      });
    });

    it('deletes the family when it has no contacts', async () => {
      (prisma.family.findFirst as jest.Mock).mockResolvedValue(mockFamily({ contacts: [] }));
      (prisma.family.delete as jest.Mock ?? (prisma as any).family.delete).mockResolvedValue(mockFamily());

      await familyService.deleteFamily('fam-1', 'org-1');

      expect((prisma as any).family.delete).toHaveBeenCalledWith({ where: { id: 'fam-1' } });
    });

    it('throws 404 if family is not found', async () => {
      (prisma.family.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(familyService.deleteFamily('missing', 'org-1')).rejects.toMatchObject({ statusCode: 404 });
    });
  });
});
