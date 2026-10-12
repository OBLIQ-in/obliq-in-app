import { notFound } from "next/navigation";
import { pages } from "@/lib/routes";
import type { Metadata } from "next";

type SectionProps = { params: Promise<{ section: string }> };

export async function generateMetadata({
  params,
}: SectionProps): Promise<Metadata> {
  const { section } = await params;
  const page = pages.find((page) => page.slug === section);
  return { title: `${page?.label || "Page not found"} | OBLIQ` };
}

export default async function SectionPage({ params }: SectionProps) {
  const { section } = await params;
  if (!pages.some((page) => page.slug !== "home" && page.slug === section))
    notFound();
  return null;
}
