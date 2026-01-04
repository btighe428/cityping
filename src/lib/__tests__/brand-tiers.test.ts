// src/lib/__tests__/brand-tiers.test.ts
/**
 * Test suite for the Brand Tier Classification System.
 *
 * This module implements a hierarchical brand taxonomy for sample sale scoring,
 * enabling intelligent hype-level calculation based on brand prestige and
 * market positioning. The tiered approach reflects the fashion industry's
 * established market segmentation.
 *
 * Fashion Industry Market Segmentation Context:
 * The luxury fashion market has historically been stratified into distinct
 * tiers since the rise of haute couture in 19th century Paris. Charles Frederick
 * Worth (1825-1895) established the first "maison de couture" in 1858, creating
 * the template for luxury fashion houses that persists today. The modern tier
 * system reflects both price points and cultural capital:
 *
 * - Luxury (Hermes, Chanel): $5,000+ handbags, multi-year waitlists, artisanal production
 * - Designer (The Row, Proenza): $500-$2,000 items, fashion week presence, limited distribution
 * - Contemporary (Theory, Vince): $100-$500 items, department store distribution
 * - Fast Fashion (Zara, H&M): $20-$100 items, rapid turnover, mass production
 *
 * Economic Rationale:
 * Sample sale attendance correlates strongly with brand tier. A Hermes sample
 * sale (occurring once every few years) generates multi-block lines and media
 * coverage. Theory sample sales, while popular, don't create the same fervor.
 * The scoring system captures this asymmetric demand signal.
 *
 * Design Decision: Case-Insensitive Matching
 * Brand names arrive from scrapers in various cases ("HERMES", "hermes", "Hermes").
 * Normalizing to lowercase provides consistent matching without requiring
 * upstream data cleaning. This follows the Robustness Principle (Postel's Law):
 * "Be conservative in what you send, liberal in what you accept."
 */

import { getBrandTier, getBrandScore, BrandTier } from "../brand-tiers";

describe("brand-tiers", () => {
  /**
   * getBrandTier Tests
   *
   * The tier classification function maps brand names to market segments.
   * Case-insensitive matching is essential since scraper data varies in
   * capitalization. The function should gracefully handle unknown brands
   * by returning "unknown" rather than throwing errors.
   */
  describe("getBrandTier", () => {
    /**
     * Luxury Tier Tests
     *
     * Luxury brands represent the apex of fashion prestige. These houses
     * typically have 100+ year histories, in-house manufacturing, and
     * maintain artificial scarcity through limited production.
     *
     * The Hermes Birkin bag exemplifies luxury economics: retail ~$10,000-$300,000,
     * resale values often exceed retail, and waitlists can span years.
     * Sample sale access to such brands is genuinely rare.
     */
    describe("luxury tier classification", () => {
      it("returns luxury for Hermes (with accent)", () => {
        expect(getBrandTier("Hermes")).toBe("luxury");
        expect(getBrandTier("hermes")).toBe("luxury");
        expect(getBrandTier("HERMES")).toBe("luxury");
      });

      it("returns luxury for Chanel", () => {
        expect(getBrandTier("Chanel")).toBe("luxury");
        expect(getBrandTier("chanel")).toBe("luxury");
      });

      it("returns luxury for Louis Vuitton", () => {
        expect(getBrandTier("Louis Vuitton")).toBe("luxury");
        expect(getBrandTier("louis vuitton")).toBe("luxury");
      });

      it("returns luxury for Brunello Cucinelli", () => {
        // Italian cashmere king, known as "King of Cashmere"
        // Average prices $1,500-$5,000 for knitwear
        expect(getBrandTier("Brunello Cucinelli")).toBe("luxury");
      });

      it("returns luxury for Bottega Veneta", () => {
        // Known for signature intrecciato weaving technique
        expect(getBrandTier("Bottega Veneta")).toBe("luxury");
      });

      it("returns luxury for Celine", () => {
        expect(getBrandTier("Celine")).toBe("luxury");
      });

      it("returns luxury for Prada", () => {
        expect(getBrandTier("Prada")).toBe("luxury");
      });

      it("returns luxury for Gucci", () => {
        expect(getBrandTier("Gucci")).toBe("luxury");
      });

      it("returns luxury for Dior", () => {
        expect(getBrandTier("Dior")).toBe("luxury");
      });
    });

    /**
     * Designer Tier Tests
     *
     * Designer brands occupy the space between accessible luxury and
     * contemporary. These are often independent designers or newer houses
     * with strong fashion week presence but without the centuries-old
     * heritage of luxury maisons.
     *
     * Many NYC-based designers (Proenza Schouler, The Row, Alexander Wang)
     * fall into this category, making their sample sales particularly
     * relevant to the CityPing user base.
     */
    describe("designer tier classification", () => {
      it("returns designer for Proenza Schouler", () => {
        expect(getBrandTier("Proenza Schouler")).toBe("designer");
      });

      it("returns designer for The Row", () => {
        // Founded by the Olsen twins, known for minimalist luxury
        expect(getBrandTier("The Row")).toBe("designer");
      });

      it("returns designer for Alexander Wang", () => {
        expect(getBrandTier("Alexander Wang")).toBe("designer");
        expect(getBrandTier("alexander wang")).toBe("designer");
      });

      it("returns designer for Phillip Lim variants", () => {
        expect(getBrandTier("Phillip Lim")).toBe("designer");
        expect(getBrandTier("3.1 Phillip Lim")).toBe("designer");
      });

      it("returns designer for Jason Wu", () => {
        expect(getBrandTier("Jason Wu")).toBe("designer");
      });

      it("returns designer for Derek Lam", () => {
        expect(getBrandTier("Derek Lam")).toBe("designer");
      });

      it("returns designer for Helmut Lang", () => {
        // Austrian designer who pioneered minimalism in the 90s
        expect(getBrandTier("Helmut Lang")).toBe("designer");
      });

      it("returns designer for Marc Jacobs", () => {
        expect(getBrandTier("Marc Jacobs")).toBe("designer");
      });

      it("returns designer for Stella McCartney", () => {
        // Known for sustainable luxury, no leather/fur
        expect(getBrandTier("Stella McCartney")).toBe("designer");
      });
    });

    /**
     * Contemporary Tier Tests
     *
     * Contemporary brands bridge designer fashion and mass market.
     * They offer quality construction and modern aesthetics at accessible
     * price points, typically found in Nordstrom, Bloomingdale's, and
     * specialty retailers.
     *
     * Sample sales for these brands are more frequent and accessible,
     * making them bread-and-butter events for CityPing users.
     */
    describe("contemporary tier classification", () => {
      it("returns contemporary for Theory", () => {
        expect(getBrandTier("Theory")).toBe("contemporary");
        expect(getBrandTier("theory")).toBe("contemporary");
      });

      it("returns contemporary for Vince", () => {
        expect(getBrandTier("Vince")).toBe("contemporary");
      });

      it("returns contemporary for Rag & Bone", () => {
        expect(getBrandTier("Rag & Bone")).toBe("contemporary");
      });

      it("returns contemporary for Equipment", () => {
        // Known for silk blouses
        expect(getBrandTier("Equipment")).toBe("contemporary");
      });

      it("returns contemporary for Joie", () => {
        expect(getBrandTier("Joie")).toBe("contemporary");
      });

      it("returns contemporary for AllSaints", () => {
        expect(getBrandTier("AllSaints")).toBe("contemporary");
      });

      it("returns contemporary for Sandro", () => {
        // French contemporary brand
        expect(getBrandTier("Sandro")).toBe("contemporary");
      });

      it("returns contemporary for Maje", () => {
        // Sister brand to Sandro
        expect(getBrandTier("Maje")).toBe("contemporary");
      });

      it("returns contemporary for Reiss", () => {
        // British contemporary brand
        expect(getBrandTier("Reiss")).toBe("contemporary");
      });

      it("returns contemporary for Club Monaco", () => {
        expect(getBrandTier("Club Monaco")).toBe("contemporary");
      });
    });

    /**
     * Fast Fashion Tier Tests
     *
     * Fast fashion brands prioritize rapid trend turnover and affordability.
     * While their sample sales exist, they generate less excitement due to
     * already-low retail prices and perceived lower quality.
     *
     * COS and & Other Stories, while part of H&M Group, position slightly
     * higher within fast fashion (sometimes called "premium fast fashion").
     */
    describe("fast fashion tier classification", () => {
      it("returns fast_fashion for Zara", () => {
        expect(getBrandTier("Zara")).toBe("fast_fashion");
      });

      it("returns fast_fashion for H&M", () => {
        expect(getBrandTier("H&M")).toBe("fast_fashion");
      });

      it("returns fast_fashion for COS", () => {
        // Collection of Style - H&M's minimalist brand
        expect(getBrandTier("COS")).toBe("fast_fashion");
      });

      it("returns fast_fashion for & Other Stories", () => {
        expect(getBrandTier("& Other Stories")).toBe("fast_fashion");
      });

      it("returns fast_fashion for Mango", () => {
        expect(getBrandTier("Mango")).toBe("fast_fashion");
      });

      it("returns fast_fashion for Uniqlo", () => {
        expect(getBrandTier("Uniqlo")).toBe("fast_fashion");
      });
    });

    /**
     * Unknown Brand Handling
     *
     * The system must gracefully handle brands not in our database.
     * This includes:
     * - New brands not yet catalogued
     * - Typos in scraper data
     * - Non-fashion brands appearing in mixed events
     *
     * Returning "unknown" rather than throwing allows the pipeline to
     * continue processing, applying a conservative default score.
     */
    describe("unknown brand handling", () => {
      it("returns unknown for unrecognized brands", () => {
        expect(getBrandTier("Random Brand XYZ")).toBe("unknown");
      });

      it("returns unknown for empty string", () => {
        expect(getBrandTier("")).toBe("unknown");
      });

      it("returns unknown for whitespace-only input", () => {
        expect(getBrandTier("   ")).toBe("unknown");
      });

      it("returns unknown for brands with typos", () => {
        // Misspelled brand names should not match
        expect(getBrandTier("Herme")).toBe("unknown");
        expect(getBrandTier("Teorhy")).toBe("unknown");
      });
    });
  });

  /**
   * getBrandScore Tests
   *
   * The scoring function converts tiers to numeric values for the
   * hype scoring algorithm. These scores represent baseline excitement
   * levels before scarcity bonuses and AI adjustments.
   *
   * Score Distribution Rationale:
   * - 95 (Luxury): Near-maximum excitement, rare events
   * - 75 (Designer): Strong interest from fashion-conscious users
   * - 55 (Contemporary): Moderate interest, frequent events
   * - 40 (Fast Fashion/Unknown): Baseline interest
   *
   * The 40-point floor for unknown brands prevents overly harsh scoring
   * for legitimate brands not yet in our database.
   */
  describe("getBrandScore", () => {
    describe("luxury brand scoring", () => {
      it("returns 95 for luxury brands", () => {
        expect(getBrandScore("Hermes")).toBe(95);
        expect(getBrandScore("Chanel")).toBe(95);
        expect(getBrandScore("Louis Vuitton")).toBe(95);
        expect(getBrandScore("Brunello Cucinelli")).toBe(95);
        expect(getBrandScore("Prada")).toBe(95);
      });

      it("returns 95 for luxury brands regardless of case", () => {
        expect(getBrandScore("HERMES")).toBe(95);
        expect(getBrandScore("chanel")).toBe(95);
      });
    });

    describe("designer brand scoring", () => {
      it("returns 75 for designer brands", () => {
        expect(getBrandScore("Alexander Wang")).toBe(75);
        expect(getBrandScore("The Row")).toBe(75);
        expect(getBrandScore("Proenza Schouler")).toBe(75);
        expect(getBrandScore("Marc Jacobs")).toBe(75);
      });
    });

    describe("contemporary brand scoring", () => {
      it("returns 55 for contemporary brands", () => {
        expect(getBrandScore("Theory")).toBe(55);
        expect(getBrandScore("Vince")).toBe(55);
        expect(getBrandScore("Rag & Bone")).toBe(55);
        expect(getBrandScore("AllSaints")).toBe(55);
      });
    });

    describe("fast fashion brand scoring", () => {
      it("returns 40 for fast fashion brands", () => {
        expect(getBrandScore("Zara")).toBe(40);
        expect(getBrandScore("H&M")).toBe(40);
        expect(getBrandScore("Uniqlo")).toBe(40);
      });
    });

    describe("unknown brand scoring", () => {
      it("returns 40 for unknown brands (conservative default)", () => {
        expect(getBrandScore("Unknown Brand")).toBe(40);
        expect(getBrandScore("")).toBe(40);
      });
    });
  });

  /**
   * Type Export Tests
   *
   * Ensure the BrandTier type is properly exported and usable
   * for type-safe consumption in other modules.
   */
  describe("BrandTier type", () => {
    it("accepts valid tier values", () => {
      const luxury: BrandTier = "luxury";
      const designer: BrandTier = "designer";
      const contemporary: BrandTier = "contemporary";
      const fastFashion: BrandTier = "fast_fashion";
      const unknown: BrandTier = "unknown";

      expect(luxury).toBe("luxury");
      expect(designer).toBe("designer");
      expect(contemporary).toBe("contemporary");
      expect(fastFashion).toBe("fast_fashion");
      expect(unknown).toBe("unknown");
    });
  });
});
