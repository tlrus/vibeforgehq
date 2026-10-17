import { z } from "zod";
export const leadSchema = z.object({ id: z.string(), name: z.string().min(2), phone: z.string().min(10), status: z.enum(["new", "in_progress", "selection_sent", "won"]) });
export const productSchema = z.object({ id: z.string(), name: z.string().min(2), type: z.string(), price: z.number().positive(), active: z.boolean() });
export type Lead = z.infer<typeof leadSchema>;
export type Product = z.infer<typeof productSchema>;
