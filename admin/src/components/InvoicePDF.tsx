import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import type { Invoice } from '../types/invoice';

Font.registerHyphenationCallback((word) => [word]);

const c = {
  indigo: '#4f46e5',
  gray900: '#111827',
  gray700: '#374151',
  gray500: '#6b7280',
  gray400: '#9ca3af',
  gray200: '#e5e7eb',
  gray100: '#f3f4f6',
  green: '#16a34a',
  red: '#dc2626',
  white: '#ffffff',
};

const STATUS_COLOR: Record<string, string> = {
  paid: c.green,
  overdue: c.red,
  sent: c.indigo,
  draft: c.gray500,
  void: c.gray400,
};

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 9, color: c.gray700, padding: 48, backgroundColor: c.white },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36 },
  orgName: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: c.gray900, marginBottom: 3 },
  orgSub: { fontSize: 8, color: c.gray500 },
  invoiceLabel: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: c.indigo, textAlign: 'right' },
  invoiceNumber: { fontSize: 10, color: c.gray500, textAlign: 'right', marginTop: 2 },

  // Status pill
  statusRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 },
  statusPill: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 8, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Meta grid
  metaGrid: { flexDirection: 'row', gap: 24, marginBottom: 32 },
  metaBlock: { flex: 1 },
  metaLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: c.gray400, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  metaValue: { fontSize: 10, color: c.gray900, fontFamily: 'Helvetica-Bold' },
  metaValueSub: { fontSize: 8.5, color: c.gray700, marginTop: 1 },

  // Divider
  divider: { borderBottomWidth: 1, borderBottomColor: c.gray200, marginBottom: 20 },

  // Table
  tableHeader: { flexDirection: 'row', backgroundColor: c.gray100, borderRadius: 4, paddingVertical: 7, paddingHorizontal: 10, marginBottom: 1 },
  tableRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: c.gray100 },
  tableRowAlt: { backgroundColor: c.gray100 },
  colDesc: { flex: 1 },
  colQty: { width: 36, textAlign: 'center' },
  colPrice: { width: 72, textAlign: 'right' },
  colTotal: { width: 72, textAlign: 'right' },
  tableHeaderText: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: c.gray500, textTransform: 'uppercase', letterSpacing: 0.5 },
  tableCellText: { fontSize: 9, color: c.gray700 },
  tableCellBold: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: c.gray900 },

  // Totals
  totalsBlock: { alignItems: 'flex-end', marginTop: 12 },
  totalsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginBottom: 4 },
  totalsLabel: { fontSize: 9, color: c.gray500, width: 90, textAlign: 'right' },
  totalsValue: { fontSize: 9, color: c.gray700, width: 80, textAlign: 'right' },
  totalsDivider: { width: 170, borderBottomWidth: 1, borderBottomColor: c.gray200, marginBottom: 6, marginTop: 2 },
  grandLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: c.gray900, width: 90, textAlign: 'right' },
  grandValue: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: c.indigo, width: 80, textAlign: 'right' },

  // Notes
  notesBox: { marginTop: 28, backgroundColor: c.gray100, borderRadius: 4, padding: 12 },
  notesLabel: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: c.gray400, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  notesText: { fontSize: 8.5, color: c.gray700, lineHeight: 1.5 },

  // Footer
  footer: { position: 'absolute', bottom: 32, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerText: { fontSize: 7.5, color: c.gray400 },
});

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function fmtDate(d: string) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(d));
}

interface Props {
  invoice: Invoice;
  orgName: string;
}

export function InvoicePDF({ invoice, orgName }: Props) {
  const billTo = invoice.contact
    ? `${invoice.contact.firstName} ${invoice.contact.lastName}`
    : invoice.family?.name ?? '—';

  const balance = invoice.amountDue - invoice.amountPaid;
  const statusColor = STATUS_COLOR[invoice.status] ?? c.gray500;

  return (
    <Document title={`${invoice.invoiceNumber} — ${orgName}`} author={orgName}>
      <Page size="LETTER" style={s.page}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View>
            <Text style={s.orgName}>{orgName}</Text>
            <Text style={s.orgSub}>Invoice</Text>
          </View>
          <View>
            <Text style={s.invoiceLabel}>INVOICE</Text>
            <Text style={s.invoiceNumber}>{invoice.invoiceNumber}</Text>
            <View style={s.statusRow}>
              <View style={[s.statusPill, { backgroundColor: statusColor + '20' }]}>
                <Text style={[s.statusText, { color: statusColor }]}>{invoice.status}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={s.divider} />

        {/* ── Meta grid ── */}
        <View style={s.metaGrid}>
          <View style={s.metaBlock}>
            <Text style={s.metaLabel}>Bill to</Text>
            <Text style={s.metaValue}>{billTo}</Text>
          </View>
          <View style={s.metaBlock}>
            <Text style={s.metaLabel}>Issue date</Text>
            <Text style={s.metaValue}>{fmtDate(invoice.createdAt)}</Text>
          </View>
          <View style={s.metaBlock}>
            <Text style={s.metaLabel}>Due date</Text>
            <Text style={s.metaValue}>{fmtDate(invoice.dueDate)}</Text>
          </View>
          {invoice.paidAt && (
            <View style={s.metaBlock}>
              <Text style={s.metaLabel}>Paid on</Text>
              <Text style={[s.metaValue, { color: c.green }]}>{fmtDate(invoice.paidAt)}</Text>
            </View>
          )}
        </View>

        {/* ── Line items table ── */}
        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderText, s.colDesc]}>Description</Text>
          <Text style={[s.tableHeaderText, s.colQty]}>Qty</Text>
          <Text style={[s.tableHeaderText, s.colPrice]}>Unit price</Text>
          <Text style={[s.tableHeaderText, s.colTotal]}>Total</Text>
        </View>

        {(invoice.lineItems ?? []).map((li, i) => (
          <View key={li.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
            <Text style={[s.tableCellText, s.colDesc]}>{li.description}</Text>
            <Text style={[s.tableCellText, s.colQty]}>{li.quantity}</Text>
            <Text style={[s.tableCellText, s.colPrice]}>{fmt(li.unitPrice)}</Text>
            <Text style={[s.tableCellBold, s.colTotal]}>{fmt(li.total)}</Text>
          </View>
        ))}

        {/* ── Totals ── */}
        <View style={s.totalsBlock}>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Subtotal</Text>
            <Text style={s.totalsValue}>{fmt(invoice.amountDue)}</Text>
          </View>
          {invoice.amountPaid > 0 && (
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>Amount paid</Text>
              <Text style={[s.totalsValue, { color: c.green }]}>− {fmt(invoice.amountPaid)}</Text>
            </View>
          )}
          <View style={s.totalsDivider} />
          <View style={s.totalsRow}>
            <Text style={s.grandLabel}>Balance due</Text>
            <Text style={s.grandValue}>{fmt(balance)}</Text>
          </View>
        </View>

        {/* ── Notes ── */}
        {invoice.notes && (
          <View style={s.notesBox}>
            <Text style={s.notesLabel}>Notes</Text>
            <Text style={s.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>{orgName}</Text>
          <Text style={s.footerText}>{invoice.invoiceNumber}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>

      </Page>
    </Document>
  );
}
