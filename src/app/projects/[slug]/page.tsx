// import ProjectDetailPage from "@/components/project/project-detail-page"
import ProjectDetailPage from "@/components/project/project-detail-page"

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  return <ProjectDetailPage slug={slug} />
}