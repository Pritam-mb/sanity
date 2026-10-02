import { ArrowRight, ShieldCheck, GitBranch, Database, CheckCircle2, TrendingUp, Sparkles } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

export interface Post {
  id: string;
  title: string;
  summary: string;
  label: string;
  author: string;
  role: string;
  published: string;
  url: string;
  icon: "shield" | "graph" | "database";
  metric: string;
  metricLabel: string;
}

export interface Blog7Props {
  tagline?: string;
  heading?: string;
  description?: string;
  buttonText?: string;
  buttonUrl?: string;
  posts?: Post[];
}

const ICONS = {
  shield: ShieldCheck,
  graph: GitBranch,
  database: Database,
} as const;

export const Blog7 = ({
  tagline = "User Stories & Case Studies",
  heading = "How Enterprises Control Policy Drift",
  description = "Discover how compliance and legal engineering teams use Fact Ledger to eliminate contradictions across contracts, customer agreements, and operational policies.",
  buttonText = "Explore live control center",
  buttonUrl = "/dashboard",
  posts = [
    {
      id: "post-1",
      title: "Eliminating Multi-Region SLA Contradictions",
      summary:
        "How a global fintech reconciled 140+ SLA clauses across terms of service and sales contracts in one audited release, reducing compliance findings by 94%.",
      label: "Enterprise FinTech",
      author: "Sarah Chen",
      role: "VP of Legal Engineering",
      published: "12 Mar 2025",
      url: "/dashboard",
      icon: "shield",
      metric: "94%",
      metricLabel: "Drift Eliminated",
    },
    {
      id: "post-2",
      title: "Automated SOC2 Data Retention Audits",
      summary:
        "Continuous Content Lake scans flagged customer data retention promises that contradicted database purge policies before third-party audits.",
      label: "Security & SOC2",
      author: "Marcus Rodriguez",
      role: "Head of Governance",
      published: "28 Feb 2025",
      url: "/dashboard",
      icon: "graph",
      metric: "0",
      metricLabel: "Audit Anomalies",
    },
    {
      id: "post-3",
      title: "Cascading Impact Tree in Production",
      summary:
        "When changing a canonical refund window from 30 to 14 days, the Clause Impact Tree identified all 23 dependent sub-pages across public and internal documents.",
      label: "Legal Engineering",
      author: "Emma Thompson",
      role: "Chief Compliance Officer",
      published: "15 Jan 2025",
      url: "/dashboard",
      icon: "database",
      metric: "23",
      metricLabel: "Pages Reconciled",
    },
  ],
}: Blog7Props) => {
  return (
    <section id="feedback" className="py-24 border-t border-white/10 bg-black overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium text-neutral-300 bg-white/5 border border-white/10 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span className="font-mono text-[11px] uppercase tracking-wider font-semibold">
              {tagline}
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-5 leading-[1.12]">
            {heading}
          </h2>
          <p className="text-neutral-400 text-sm sm:text-base leading-relaxed mb-6 max-w-2xl mx-auto">
            {description}
          </p>
          <Link
            href={buttonUrl}
            className="inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-neutral-300 transition-colors group"
          >
            <span>{buttonText}</span>
            <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* 3 Case Study Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 w-full">
          {posts.map((post) => {
            const Icon = ICONS[post.icon];
            return (
              <Card
                key={post.id}
                className="flex flex-col border border-white/10 bg-neutral-950/80 rounded-2xl overflow-hidden hover:border-white/30 transition-all duration-200 group hover:shadow-[0_0_30px_rgba(255,255,255,0.03)]"
              >
                {/* Visual Header Banner */}
                <div className="h-44 w-full bg-gradient-to-br from-neutral-900 to-black p-5 flex flex-col justify-between border-b border-white/10 relative overflow-hidden">
                  {/* Subtle background grid pattern */}
                  <div
                    className="absolute inset-0 opacity-20 pointer-events-none"
                    style={{
                      backgroundImage: "radial-gradient(rgba(255,255,255,0.2) 1px, transparent 1px)",
                      backgroundSize: "16px 16px",
                    }}
                  />

                  {/* Top row: Icon + Category Badge */}
                  <div className="flex items-center justify-between relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center font-bold shadow-md shadow-white/10">
                      <Icon size={20} strokeWidth={2.2} />
                    </div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-300 bg-white/10 border border-white/15 px-2.5 py-1 rounded-full">
                      {post.label}
                    </span>
                  </div>

                  {/* Bottom row: High-contrast metric pill */}
                  <div className="flex items-baseline justify-between relative z-10 pt-2 border-t border-white/5">
                    <div>
                      <div className="text-2xl font-black tracking-tight text-white font-mono">
                        {post.metric}
                      </div>
                      <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                        {post.metricLabel}
                      </div>
                    </div>
                    <div className="text-[11px] font-mono text-neutral-400">
                      {post.published}
                    </div>
                  </div>
                </div>

                {/* Card Content */}
                <CardHeader className="p-6 pb-3">
                  <h3 className="text-lg font-bold text-white group-hover:text-neutral-200 leading-snug tracking-tight">
                    <Link href={post.url} className="hover:underline underline-offset-4">
                      {post.title}
                    </Link>
                  </h3>
                </CardHeader>

                <CardContent className="px-6 py-2 flex-1">
                  <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed">
                    {post.summary}
                  </p>
                </CardContent>

                {/* Card Footer: Author + Link */}
                <CardFooter className="p-6 pt-4 flex items-center justify-between border-t border-white/10 mt-4 text-xs">
                  <div>
                    <div className="font-semibold text-white">{post.author}</div>
                    <div className="text-[11px] text-neutral-500">{post.role}</div>
                  </div>
                  <Link
                    href={post.url}
                    className="inline-flex items-center gap-1.5 font-bold text-white group-hover:text-white group-hover:underline underline-offset-4"
                  >
                    <span>Read review</span>
                    <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Blog7;
