import { Download } from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Button } from './ui/Button';
import { InvoicePDF } from './InvoicePDF';
import type { Invoice } from '../types/invoice';

interface Props {
  invoice: Invoice;
  orgName: string;
}

export function InvoiceDownloadButton({ invoice, orgName }: Props) {
  return (
    <PDFDownloadLink
      document={<InvoicePDF invoice={invoice} orgName={orgName} />}
      fileName={`${invoice.invoiceNumber}.pdf`}
    >
      {({ loading }) => (
        <Button variant="secondary" size="sm" loading={loading}>
          <Download className="h-3.5 w-3.5 mr-1.5" />
          {loading ? 'Preparing…' : 'Download PDF'}
        </Button>
      )}
    </PDFDownloadLink>
  );
}
