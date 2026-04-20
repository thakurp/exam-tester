import Link from "next/link";
import { Show, SignInButton } from "@clerk/nextjs";
import { BookOpen, Brain, Trophy, Zap, ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const exams = [
  { name: "AP Macroeconomics", badge: "AP", color: "bg-blue-500" },
  { name: "AP Microeconomics", badge: "AP", color: "bg-violet-500" },
  { name: "SAT Math", badge: "SAT", color: "bg-emerald-500" },
  { name: "SAT Reading & Writing", badge: "SAT", color: "bg-amber-500" },
  { name: "NSW Mathematics Advanced", badge: "NSW", color: "bg-red-500" },
  { name: "NSW Chemistry", badge: "NSW", color: "bg-cyan-500" },
  { name: "NSW Physics", badge: "NSW", color: "bg-lime-600" },
  { name: "NSW Biology", badge: "NSW", color: "bg-green-500" },
  { name: "NSW Economics", badge: "NSW", color: "bg-orange-500" },
  { name: "NSW English Advanced", badge: "NSW", color: "bg-pink-500" },
];

const features = [
  { icon: Brain, title: "AI-Powered Explanations", description: "Click 'Explain Me' after any question and get a clear, detailed AI breakdown of why the answer is correct." },
  { icon: Zap, title: "Instant Results", description: "Get scored immediately after each test with per-question feedback and topic breakdowns." },
  { icon: Trophy, title: "Earn Points", description: "Earn XP for every correct answer. Build streaks and climb the leaderboard." },
  { icon: BookOpen, title: "10 Exams Covered", description: "AP Macro, AP Micro, SAT, and all major NSW Year 11 subjects — all in one place." },
];

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-indigo-600" />
            <span className="font-bold text-lg">ExamTester</span>
          </div>
          <div className="flex items-center gap-3">
            <Show when="signed-out" fallback={
              <Button asChild>
                <Link href="/dashboard">Go to Dashboard <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
            }>
              <SignInButton mode="modal">
                <Button variant="ghost">Sign In</Button>
              </SignInButton>
              <SignInButton mode="modal">
                <Button>Start Free</Button>
              </SignInButton>
            </Show>
          </div>
        </div>
      </header>

      <section className="bg-gradient-to-br from-indigo-50 via-white to-violet-50 py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Badge className="mb-4 bg-indigo-100 text-indigo-700 hover:bg-indigo-100">AP • SAT • NSW Year 11</Badge>
          <h1 className="text-5xl font-bold tracking-tight text-gray-900 mb-6">
            Ace your exams with <span className="text-indigo-600">AI-powered practice</span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Practice thousands of real exam questions. Get instant AI explanations for every answer. Track your progress. Earn rewards.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Show when="signed-out" fallback={
              <Button size="lg" asChild className="text-base px-8">
                <Link href="/dashboard">Go to Dashboard <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
            }>
              <SignInButton mode="modal">
                <Button size="lg" className="text-base px-8">Start Practising Free <ArrowRight className="ml-2 h-5 w-5" /></Button>
              </SignInButton>
            </Show>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Exams covered</h2>
          <p className="text-gray-500 text-center mb-12">Built for AV — and every student preparing for competitive exams</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {exams.map((exam) => (
              <Card key={exam.name} className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="p-4 text-center">
                  <div className={`${exam.color} text-white text-xs font-bold px-2 py-1 rounded-full inline-block mb-2`}>{exam.badge}</div>
                  <p className="text-sm font-medium text-gray-800 group-hover:text-indigo-600 transition-colors">{exam.name}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Everything you need to prepare</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <div key={f.title} className="bg-white rounded-xl p-6 shadow-sm">
                <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5 text-indigo-600" />
                </div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-indigo-600 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <CheckCircle className="h-12 w-12 mx-auto mb-4 text-indigo-200" />
          <h2 className="text-3xl font-bold mb-4">Ready to start?</h2>
          <p className="text-indigo-200 mb-8">Free to use. No credit card required. Start practising in 30 seconds.</p>
          <Show when="signed-out" fallback={
            <Button size="lg" variant="secondary" asChild className="text-base px-8">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          }>
            <SignInButton mode="modal">
              <Button size="lg" variant="secondary" className="text-base px-8">Create Free Account <ArrowRight className="ml-2 h-5 w-5" /></Button>
            </SignInButton>
          </Show>
        </div>
      </section>

      <footer className="py-8 px-4 text-center text-sm text-gray-400 border-t">
        <p>© {new Date().getFullYear()} ExamTester. Built for AV and every student who aims higher.</p>
      </footer>
    </div>
  );
}
