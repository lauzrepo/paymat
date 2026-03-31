import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../../../src/config/database';
import { AppError } from '../../../src/middleware/errorHandler';
import programService from '../../../src/services/programService';

jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

const ORG_ID = 'org-1';
const PROGRAM_ID = 'prog-1';

const mockProgram = {
  id: PROGRAM_ID,
  organizationId: ORG_ID,
  name: 'Swim Lessons',
  description: 'Beginner swim lessons',
  price: new Decimal(49.99),
  billingFrequency: 'monthly',
  capacity: 10,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('programService.createProgram', () => {
  it('calls prisma.program.create with price converted to Decimal', async () => {
    (prisma.program.create as jest.Mock).mockResolvedValue(mockProgram);

    const data = {
      organizationId: ORG_ID,
      name: 'Swim Lessons',
      description: 'Beginner swim lessons',
      price: 49.99,
      billingFrequency: 'monthly',
      capacity: 10,
    };

    const result = await programService.createProgram(data);

    expect(prisma.program.create).toHaveBeenCalledTimes(1);
    const callArg = (prisma.program.create as jest.Mock).mock.calls[0][0];
    expect(callArg.data.price).toBeInstanceOf(Decimal);
    expect(callArg.data.price.toNumber()).toBe(49.99);
    expect(callArg.data.name).toBe('Swim Lessons');
    expect(callArg.data.organizationId).toBe(ORG_ID);
    expect(result).toEqual(mockProgram);
  });
});

describe('programService.getPrograms', () => {
  it('returns programs with pagination metadata', async () => {
    const programs = [mockProgram];
    (prisma.program.findMany as jest.Mock).mockResolvedValue(programs);
    (prisma.program.count as jest.Mock).mockResolvedValue(1);

    const result = await programService.getPrograms(ORG_ID, 1, 20);

    expect(result.programs).toEqual(programs);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(1);
  });

  it('calculates totalPages correctly for multi-page results', async () => {
    (prisma.program.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.program.count as jest.Mock).mockResolvedValue(45);

    const result = await programService.getPrograms(ORG_ID, 2, 20);

    expect(result.total).toBe(45);
    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(3);
  });

  it('adds isActive: true to where clause when activeOnly=true', async () => {
    (prisma.program.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.program.count as jest.Mock).mockResolvedValue(0);

    await programService.getPrograms(ORG_ID, 1, 20, true);

    const findManyCall = (prisma.program.findMany as jest.Mock).mock.calls[0][0];
    const countCall = (prisma.program.count as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where).toMatchObject({ organizationId: ORG_ID, isActive: true });
    expect(countCall.where).toMatchObject({ organizationId: ORG_ID, isActive: true });
  });

  it('does not add isActive to where clause when activeOnly=false', async () => {
    (prisma.program.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.program.count as jest.Mock).mockResolvedValue(0);

    await programService.getPrograms(ORG_ID, 1, 20, false);

    const findManyCall = (prisma.program.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where).not.toHaveProperty('isActive');
  });

  it('calculates skip as (page - 1) * limit', async () => {
    (prisma.program.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.program.count as jest.Mock).mockResolvedValue(0);

    await programService.getPrograms(ORG_ID, 3, 10);

    const findManyCall = (prisma.program.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.skip).toBe(20); // (3-1) * 10
    expect(findManyCall.take).toBe(10);
  });

  it('uses skip=0 for page 1', async () => {
    (prisma.program.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.program.count as jest.Mock).mockResolvedValue(0);

    await programService.getPrograms(ORG_ID, 1, 20);

    const findManyCall = (prisma.program.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.skip).toBe(0);
  });
});

describe('programService.getProgramById', () => {
  it('returns the program when found', async () => {
    (prisma.program.findFirst as jest.Mock).mockResolvedValue(mockProgram);

    const result = await programService.getProgramById(PROGRAM_ID, ORG_ID);

    expect(result).toEqual(mockProgram);
  });

  it('throws AppError 404 when program is not found', async () => {
    (prisma.program.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(programService.getProgramById(PROGRAM_ID, ORG_ID)).rejects.toThrow(AppError);
    await expect(programService.getProgramById(PROGRAM_ID, ORG_ID)).rejects.toMatchObject({
      statusCode: 404,
      message: 'Program not found',
    });
  });

  it('scopes query by organizationId', async () => {
    (prisma.program.findFirst as jest.Mock).mockResolvedValue(mockProgram);

    await programService.getProgramById(PROGRAM_ID, ORG_ID);

    const callArg = (prisma.program.findFirst as jest.Mock).mock.calls[0][0];
    expect(callArg.where).toMatchObject({ id: PROGRAM_ID, organizationId: ORG_ID });
  });
});

describe('programService.updateProgram', () => {
  it('calls prisma.program.update with the correct data', async () => {
    (prisma.program.findFirst as jest.Mock).mockResolvedValue(mockProgram);
    const updated = { ...mockProgram, name: 'Advanced Swim' };
    (prisma.program.update as jest.Mock).mockResolvedValue(updated);

    const result = await programService.updateProgram(PROGRAM_ID, ORG_ID, { name: 'Advanced Swim' });

    expect(prisma.program.update).toHaveBeenCalledTimes(1);
    const callArg = (prisma.program.update as jest.Mock).mock.calls[0][0];
    expect(callArg.where).toEqual({ id: PROGRAM_ID });
    expect(callArg.data.name).toBe('Advanced Swim');
    expect(result).toEqual(updated);
  });

  it('converts price to Decimal when price is provided', async () => {
    (prisma.program.findFirst as jest.Mock).mockResolvedValue(mockProgram);
    (prisma.program.update as jest.Mock).mockResolvedValue({ ...mockProgram, price: new Decimal(99.99) });

    await programService.updateProgram(PROGRAM_ID, ORG_ID, { price: 99.99 });

    const callArg = (prisma.program.update as jest.Mock).mock.calls[0][0];
    expect(callArg.data.price).toBeInstanceOf(Decimal);
    expect(callArg.data.price.toNumber()).toBe(99.99);
  });

  it('does not include price in update data when price is not provided', async () => {
    (prisma.program.findFirst as jest.Mock).mockResolvedValue(mockProgram);
    (prisma.program.update as jest.Mock).mockResolvedValue({ ...mockProgram, capacity: 20 });

    await programService.updateProgram(PROGRAM_ID, ORG_ID, { capacity: 20 });

    const callArg = (prisma.program.update as jest.Mock).mock.calls[0][0];
    expect(callArg.data).not.toHaveProperty('price');
  });

  it('throws 404 when program is not found (delegates to getProgramById)', async () => {
    (prisma.program.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      programService.updateProgram(PROGRAM_ID, ORG_ID, { name: 'Does Not Matter' })
    ).rejects.toMatchObject({ statusCode: 404, message: 'Program not found' });

    expect(prisma.program.update).not.toHaveBeenCalled();
  });
});
