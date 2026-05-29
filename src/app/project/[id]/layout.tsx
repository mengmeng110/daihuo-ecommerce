export async function generateStaticParams() {
  return [{ id: 'demo' }]
}

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
