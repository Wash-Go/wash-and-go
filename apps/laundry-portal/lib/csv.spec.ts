import type { RemittanceBatchDetailView } from '@wash-and-go/domain';
import { csvCell, payoutCsv, payoutCsvName, toCsv } from './csv';

describe('csvCell', () => {
  it('leaves plain values alone', () => {
    expect(csvCell('WG-2026-000147')).toBe('WG-2026-000147');
    expect(csvCell('180.00')).toBe('180.00');
    expect(csvCell(null)).toBe('');
  });

  it('quotes commas, quotes and line breaks, doubling inner quotes', () => {
    expect(csvCell('Tetuan, Zamboanga')).toBe('"Tetuan, Zamboanga"');
    expect(csvCell('the "big" bag')).toBe('"the ""big"" bag"');
    expect(csvCell('two\nlines')).toBe('"two\nlines"');
  });

  it('defuses spreadsheet formulas in text', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('@cmd')).toBe("'@cmd");
    expect(csvCell('+1')).toBe("'+1");
  });
});

describe('toCsv', () => {
  it('joins rows with CRLF and ends with one', () => {
    expect(toCsv([['a', 'b'], ['1', '2']])).toBe('a,b\r\n1,2\r\n');
  });
});

const batch = {
  id: 'b1',
  periodStart: '2026-10-05T16:00:00.000Z', // Oct 6 00:00 Manila
  periodEnd: '2026-10-12T16:00:00.000Z', // Oct 13 00:00 Manila, exclusive
  totalPhp: '316.80',
  lineCount: 2,
  status: 'PENDING',
  reference: null,
  lines: [
    {
      id: 'l1',
      orderId: 'o1',
      orderCode: 'WG-2026-000141',
      deliveredAt: '2026-10-07T03:10:00.000Z',
      washValuePhp: '180.00',
      commissionPhp: '21.60',
      payoutPhp: '158.40',
      createdAt: '2026-10-07T03:10:00.000Z',
    },
    {
      id: 'l2',
      orderId: 'o2',
      orderCode: 'WG-2026-000145',
      deliveredAt: null,
      washValuePhp: '180',
      commissionPhp: '21.6',
      payoutPhp: '158.4',
      createdAt: '2026-10-08T03:10:00.000Z',
    },
  ],
} as unknown as RemittanceBatchDetailView;

describe('payoutCsv', () => {
  it('has a header row and one row per line, money as plain two-decimal numbers', () => {
    expect(payoutCsv(batch)).toBe(
      'Order code,Delivered (Manila),Wash value (PHP),Commission (PHP),Payout (PHP)\r\n' +
        'WG-2026-000141,2026-10-07 11:10,180.00,21.60,158.40\r\n' +
        'WG-2026-000145,,180.00,21.60,158.40\r\n',
    );
  });

  it('writes only the header row for a batch with no lines', () => {
    expect(payoutCsv({ ...batch, lines: [] })).toBe(
      'Order code,Delivered (Manila),Wash value (PHP),Commission (PHP),Payout (PHP)\r\n',
    );
  });

  it('never writes the peso sign or thousands separators', () => {
    const big = { ...batch, lines: [{ ...batch.lines[0], washValuePhp: '12345.5' }] };
    expect(payoutCsv(big)).toContain(',12345.50,');
    expect(payoutCsv(big)).not.toContain('₱');
  });
});

describe('payoutCsvName', () => {
  it('names the file by the period days, inclusive, in Manila', () => {
    expect(payoutCsvName(batch)).toBe('payout-2026-10-06-2026-10-12.csv');
  });
});
