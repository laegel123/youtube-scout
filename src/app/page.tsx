import { AnalyzeForm } from "@/components/AnalyzeForm";

// Server 셸: 페이지 레이아웃·헤더만 그리고, 인터랙션/결과 상태는 AnalyzeForm(Client)이 소유한다.
// 결과 컴포넌트(VideoCard·RankingTable·Recommendations)는 클라이언트 상태에 의존하므로
// 상태를 가진 AnalyzeForm 안에서 순서대로 조립한다.
export default function Home() {
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">TubeScout</h1>
        <p className="mt-2 text-gray-600">
          시드 영상이나 주제를 입력하면 비슷한 영상을 정량 지표로 비교·순위화하고
          다음 콘텐츠를 추천합니다.
        </p>
      </header>
      <AnalyzeForm />
    </main>
  );
}
