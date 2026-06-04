const passthrough = (_req: any, _res: any, next: any) => next();

export const apiLimiter = passthrough;
export const authLimiter = passthrough;
export const paymentLimiter = passthrough;
export const webhookLimiter = passthrough;
