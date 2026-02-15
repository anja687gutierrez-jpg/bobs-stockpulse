import { z } from "zod/v4";

export const PortfolioSchema = z.object({
  holdings: z.array(
    z.object({
      ticker: z.string().regex(/^[A-Z]{1,5}$/),
      shares: z.number().min(0).default(0),
    })
  ).min(1),
});

export type PortfolioExtraction = z.infer<typeof PortfolioSchema>;
