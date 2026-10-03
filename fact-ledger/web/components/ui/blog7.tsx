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
    <section id="feedback" className="case-studies-section">
      <div className="case-studies-inner">
        {/* Section Header */}
        <div className="case-studies-header">
          <div className="case-studies-badge">
            <span className="case-studies-badge-dot" />
            <span className="case-studies-badge-text">
              {tagline}
            </span>
          </div>
          <h2 className="case-studies-title">
            {heading}
          </h2>
          <p className="case-studies-desc">
            {description}
          </p>
          <Link
            href={buttonUrl}
            className="case-studies-link group"
          >
            <span>{buttonText}</span>
            <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* 3 Case Study Cards Grid */}
        <div className="case-studies-grid">
          {posts.map((post) => {
            const Icon = ICONS[post.icon];
            return (
              <div key={post.id} className="case-study-card group">
                {/* Visual Header Banner */}
                <div className="case-study-banner">
                  <div className="case-study-banner-pattern" />

                  {/* Top row: Icon + Category Badge */}
                  <div className="case-study-banner-top">
                    <div className="case-study-icon-wrap">
                      <Icon size={20} strokeWidth={2.2} />
                    </div>
                    <span className="case-study-category-badge">
                      {post.label}
                    </span>
                  </div>

                  {/* Bottom row: High-contrast metric */}
                  <div className="case-study-banner-bottom">
                    <div>
                      <div className="case-study-metric-val">
                        {post.metric}
                      </div>
                      <div className="case-study-metric-label">
                        {post.metricLabel}
                      </div>
                    </div>
                    <div className="case-study-pub-date">
                      {post.published}
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="case-study-body">
                  <h3 className="case-study-card-title">
                    <Link href={post.url}>
                      {post.title}
                    </Link>
                  </h3>
                  <p className="case-study-card-desc">
                    {post.summary}
                  </p>
                </div>

                {/* Card Footer: Author + Link */}
                <div className="case-study-footer">
                  <div>
                    <div className="case-study-author-name">{post.author}</div>
                    <div className="case-study-author-role">{post.role}</div>
                  </div>
                  <Link
                    href={post.url}
                    className="case-study-action-btn"
                  >
                    <span>Read review</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Blog7;
