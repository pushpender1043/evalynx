import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { PerformancePoint } from '../../types';
import { EmptyPerformanceIllustration } from '../illustrations';
import { ClayCard, EmptyState } from '../ui';

interface PerformanceChartProps {
  data: PerformancePoint[];
}

export function PerformanceChart({ data }: PerformanceChartProps) {
  const latest = data[data.length - 1];
  const first = data[0];
  const delta = latest && first ? latest.classAverage - first.classAverage : 0;

  return (
    <ClayCard className="flex flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-bold tracking-tight text-[var(--text-primary)]">
            Class Performance
          </h2>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Average score (%) and pass rate across graded assessments
          </p>
        </div>
        {data.length > 0 && (
          <div className="text-right">
            <p className="text-xs font-bold text-[var(--semantic-mint-text)] tabular-nums">
              {delta >= 0 ? `+${delta}%` : `${delta}%`} trend
            </p>
            <p className="text-[11px] text-[var(--text-muted)] tabular-nums">
              {data.length} graded {data.length === 1 ? 'test' : 'tests'}
            </p>
          </div>
        )}
      </div>

      {data.length === 0 ? (
        <div className="mt-2">
          <EmptyState
            embedded
            compact
            illustration={<EmptyPerformanceIllustration size={132} />}
            title="No performance data yet"
            description="Once students complete your tests and scores are published, class trends will appear here."
          />
        </div>
      ) : (
        <div className="mt-5 h-[220px] w-full min-w-0 overflow-hidden">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="evxAvgFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6C5CE7" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#6C5CE7" stopOpacity={0.01} />
                </linearGradient>
                <linearGradient id="evxPassFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5CC9A7" stopOpacity={0.16} />
                  <stop offset="95%" stopColor="#5CC9A7" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="4 4"
                stroke="var(--text-muted)"
                strokeOpacity={0.15}
                vertical={false}
              />
              <XAxis
                dataKey="testShortName"
                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                axisLine={false}
                tickLine={false}
                unit="%"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '16px',
                  fontSize: '12px',
                  color: 'var(--text-primary)',
                  boxShadow: 'var(--shadow-clay-sm)',
                }}
                formatter={(value, name) => [
                  `${value ?? 0}%`,
                  name === 'classAverage' ? 'Class Average' : 'Pass Rate',
                ]}
              />
              <Area
                type="monotone"
                dataKey="passRate"
                stroke="#5CC9A7"
                strokeWidth={2}
                fill="url(#evxPassFill)"
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="classAverage"
                stroke="#6C5CE7"
                strokeWidth={2.5}
                fill="url(#evxAvgFill)"
                activeDot={{ r: 5, fill: '#6C5CE7', strokeWidth: 2, stroke: '#ffffff' }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </ClayCard>
  );
}
