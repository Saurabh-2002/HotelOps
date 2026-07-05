import { Test, TestingModule } from '@nestjs/testing';
import { BillingService } from './billing.service';
import { PrismaService } from '../prisma/prisma.service';

describe('BillingService', () => {
  let service: BillingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
  });

  describe('calculateGst (Phase 1-2 Fix)', () => {
    it('1. Daily tariff below ₹7,500 (12%)', () => {
      const result = service.calculateGst(5000, 5000);
      expect(result.cgst).toBe(300); // 6% of 5000
      expect(result.sgst).toBe(300);
    });

    it('2. Daily tariff exactly ₹7,500 (12%)', () => {
      const result = service.calculateGst(7500, 7500);
      expect(result.cgst).toBe(450); // 6% of 7500
      expect(result.sgst).toBe(450);
    });

    it('3. Daily tariff above ₹7,500 (18%)', () => {
      const result = service.calculateGst(8000, 8000);
      expect(result.cgst).toBe(720); // 9% of 8000
      expect(result.sgst).toBe(720);
    });

    it('4. Multi-night total exceeds ₹7,500 but daily tariff is below threshold', () => {
      // 3 nights @ 3000 = 9000 total. Slab should be 12% because 3000 <= 7500
      const result = service.calculateGst(9000, 3000);
      expect(result.cgst).toBe(540); // 6% of 9000
      expect(result.sgst).toBe(540);
    });

    it('5. Multi-night stay with daily tariff above ₹7,500', () => {
      // 2 nights @ 8000 = 16000 total. Slab should be 18%
      const result = service.calculateGst(16000, 8000);
      expect(result.cgst).toBe(1440); // 9% of 16000
      expect(result.sgst).toBe(1440);
    });

    it('6. One-night stay', () => {
      const result = service.calculateGst(2000, 2000);
      expect(result.cgst).toBe(120);
      expect(result.sgst).toBe(120);
    });

    it('7. Invalid/zero-night stay behavior (fallback to totalAmount)', () => {
      // If dailyRate is missing, falls back to totalAmount as basis.
      // Total 3000 -> 12%
      const result = service.calculateGst(3000);
      expect(result.cgst).toBe(180); 
      expect(result.sgst).toBe(180);
    });

    it('8. Rounding behavior', () => {
      // 1234.56 * 6% = 74.0736 -> Round to 74.07
      const result = service.calculateGst(1234.56, 1234.56);
      expect(result.cgst).toBe(74.07);
    });

    it('9. Existing restaurant GST behavior (fallback usage without dailyRate)', () => {
      // Though POS uses hardcoded 2.5%, if it ever called calculateGst with total amount < 7500, it safely uses 12%.
      const result = service.calculateGst(500); 
      expect(result.cgst).toBe(30);
    });
  });
});
