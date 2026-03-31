import prisma from '../../../src/config/database';
import contactService from '../../../src/services/contactService';

const ORG_ID = 'org-1';
const CONTACT_ID = 'contact-1';

const makeContact = (overrides = {}) => ({
  id: CONTACT_ID,
  organizationId: ORG_ID,
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  phone: null,
  dateOfBirth: null,
  notes: null,
  status: 'active',
  familyId: null,
  family: null,
  enrollments: [],
  invoices: [],
  ...overrides,
});

describe('ContactService', () => {
  describe('createContact', () => {
    it('creates and returns a contact with family and enrollments includes', async () => {
      const created = makeContact();
      (prisma.contact.create as jest.Mock).mockResolvedValue(created);

      const result = await contactService.createContact({
        organizationId: ORG_ID,
        firstName: 'Jane',
        lastName: 'Doe',
      });

      expect(prisma.contact.create).toHaveBeenCalledWith({
        data: { organizationId: ORG_ID, firstName: 'Jane', lastName: 'Doe' },
        include: { family: true, enrollments: { include: { program: true } } },
      });
      expect(result).toEqual(created);
    });
  });

  describe('getContacts', () => {
    it('returns paginated contacts with metadata', async () => {
      const contacts = [makeContact()];
      (prisma.contact.findMany as jest.Mock).mockResolvedValue(contacts);
      (prisma.contact.count as jest.Mock).mockResolvedValue(1);

      const result = await contactService.getContacts(ORG_ID, 1, 20);

      expect(result).toEqual({ contacts, total: 1, page: 1, totalPages: 1 });
    });

    it('calculates skip as (page - 1) * limit', async () => {
      (prisma.contact.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.contact.count as jest.Mock).mockResolvedValue(0);

      await contactService.getContacts(ORG_ID, 3, 10);

      expect(prisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });

    it('adds OR search filter when search is provided', async () => {
      (prisma.contact.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.contact.count as jest.Mock).mockResolvedValue(0);

      await contactService.getContacts(ORG_ID, 1, 20, { search: 'jane' });

      expect(prisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { firstName: { contains: 'jane', mode: 'insensitive' } },
              { lastName: { contains: 'jane', mode: 'insensitive' } },
              { email: { contains: 'jane', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('filters by status when provided', async () => {
      (prisma.contact.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.contact.count as jest.Mock).mockResolvedValue(0);

      await contactService.getContacts(ORG_ID, 1, 20, { status: 'inactive' });

      expect(prisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'inactive' }),
        }),
      );
    });

    it('filters by familyId when provided', async () => {
      (prisma.contact.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.contact.count as jest.Mock).mockResolvedValue(0);

      await contactService.getContacts(ORG_ID, 1, 20, { familyId: 'family-1' });

      expect(prisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ familyId: 'family-1' }),
        }),
      );
    });
  });

  describe('getContactById', () => {
    it('returns the contact when found', async () => {
      const contact = makeContact();
      (prisma.contact.findFirst as jest.Mock).mockResolvedValue(contact);

      const result = await contactService.getContactById(CONTACT_ID, ORG_ID);

      expect(result).toEqual(contact);
    });

    it('throws 404 when contact is not found', async () => {
      (prisma.contact.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(contactService.getContactById(CONTACT_ID, ORG_ID)).rejects.toMatchObject({
        statusCode: 404,
        message: 'Contact not found',
      });
    });

    it('scopes the lookup by organizationId', async () => {
      const contact = makeContact();
      (prisma.contact.findFirst as jest.Mock).mockResolvedValue(contact);

      await contactService.getContactById(CONTACT_ID, ORG_ID);

      expect(prisma.contact.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: CONTACT_ID, organizationId: ORG_ID },
        }),
      );
    });
  });

  describe('updateContact', () => {
    it('calls prisma.contact.update with the provided data', async () => {
      const contact = makeContact();
      const updated = makeContact({ firstName: 'Janet' });
      (prisma.contact.findFirst as jest.Mock).mockResolvedValue(contact);
      (prisma.contact.update as jest.Mock).mockResolvedValue(updated);

      const result = await contactService.updateContact(CONTACT_ID, ORG_ID, { firstName: 'Janet' });

      expect(prisma.contact.update).toHaveBeenCalledWith({
        where: { id: CONTACT_ID },
        data: { firstName: 'Janet' },
        include: { family: true, enrollments: { include: { program: true } } },
      });
      expect(result).toEqual(updated);
    });

    it('throws 404 if the contact does not exist (delegates to getContactById)', async () => {
      (prisma.contact.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        contactService.updateContact(CONTACT_ID, ORG_ID, { firstName: 'X' }),
      ).rejects.toMatchObject({ statusCode: 404 });

      expect(prisma.contact.update).not.toHaveBeenCalled();
    });
  });

  describe('deactivateContact', () => {
    it('cancels active/paused enrollments and sets status to inactive', async () => {
      const contact = makeContact();
      const deactivated = makeContact({ status: 'inactive' });
      (prisma.contact.findFirst as jest.Mock).mockResolvedValue(contact);
      (prisma.enrollment.updateMany as jest.Mock).mockResolvedValue({ count: 2 });
      (prisma.contact.update as jest.Mock).mockResolvedValue(deactivated);

      await contactService.deactivateContact(CONTACT_ID, ORG_ID);

      expect(prisma.enrollment.updateMany).toHaveBeenCalledWith({
        where: { contactId: CONTACT_ID, status: { in: ['active', 'paused'] } },
        data: { status: 'cancelled', endDate: expect.any(Date), nextBillingDate: null },
      });
      expect(prisma.contact.update).toHaveBeenCalledWith({
        where: { id: CONTACT_ID },
        data: { status: 'inactive' },
      });
    });

    it('throws 404 if the contact does not exist', async () => {
      (prisma.contact.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(contactService.deactivateContact(CONTACT_ID, ORG_ID)).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe('reactivateContact', () => {
    it('sets contact status to active', async () => {
      const contact = makeContact({ status: 'inactive' });
      const reactivated = makeContact({ status: 'active' });
      (prisma.contact.findFirst as jest.Mock).mockResolvedValue(contact);
      (prisma.contact.update as jest.Mock).mockResolvedValue(reactivated);

      const result = await contactService.reactivateContact(CONTACT_ID, ORG_ID);

      expect(prisma.contact.update).toHaveBeenCalledWith({
        where: { id: CONTACT_ID },
        data: { status: 'active' },
      });
      expect(result).toEqual(reactivated);
    });
  });

  describe('deleteContact', () => {
    it('throws 400 if the contact has invoices', async () => {
      const contact = makeContact();
      (prisma.contact.findFirst as jest.Mock).mockResolvedValue(contact);
      // invoice.findMany used inside payment.count's `in` clause
      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.invoice.count as jest.Mock).mockResolvedValue(2);
      (prisma.payment.count as jest.Mock).mockResolvedValue(0);

      await expect(contactService.deleteContact(CONTACT_ID, ORG_ID)).rejects.toMatchObject({
        statusCode: 400,
        message: 'Cannot delete a contact with invoices or payments. Deactivate instead.',
      });
    });

    it('throws 400 if the contact has payments linked to its invoices', async () => {
      const contact = makeContact();
      (prisma.contact.findFirst as jest.Mock).mockResolvedValue(contact);
      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([{ id: 'inv-1' }]);
      (prisma.invoice.count as jest.Mock).mockResolvedValue(0);
      (prisma.payment.count as jest.Mock).mockResolvedValue(3);

      await expect(contactService.deleteContact(CONTACT_ID, ORG_ID)).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('deletes enrollments then the contact when there are no invoices or payments', async () => {
      const contact = makeContact();
      (prisma.contact.findFirst as jest.Mock).mockResolvedValue(contact);
      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.invoice.count as jest.Mock).mockResolvedValue(0);
      (prisma.payment.count as jest.Mock).mockResolvedValue(0);
      (prisma.enrollment.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      // contact.delete is not in the mock by default; add it here
      (prisma.contact as any).delete = jest.fn().mockResolvedValue(contact);

      const result = await contactService.deleteContact(CONTACT_ID, ORG_ID);

      expect(prisma.enrollment.deleteMany).toHaveBeenCalledWith({ where: { contactId: CONTACT_ID } });
      expect((prisma.contact as any).delete).toHaveBeenCalledWith({ where: { id: CONTACT_ID } });
      expect(result).toEqual(contact);
    });

    it('throws 404 if the contact does not exist', async () => {
      (prisma.contact.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(contactService.deleteContact(CONTACT_ID, ORG_ID)).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });
});
