import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">saju-ai</h1>
      <p className="mt-2 text-sm">스캐폴딩 확인용 화면.</p>
    </main>
  );
}
