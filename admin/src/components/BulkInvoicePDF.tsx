import { Document } from '@react-pdf/renderer';
import { InvoicePage } from './InvoicePDF';
import type { Invoice } from '../types/invoice';

interface Props {
  invoices: Invoice[];
  orgName: string;
}

export function BulkInvoicePDF({ invoices, orgName }: Props) {
  return (
    <Document author={orgName}>
      {invoices.map((inv) => (
        <InvoicePage key={inv.id} invoice={inv} orgName={orgName} />
      ))}
    </Document>
  );
}
