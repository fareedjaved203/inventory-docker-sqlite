import React from 'react';

const colorClasses = {
  blue: {
    bg: 'bg-gradient-to-br from-blue-50 to-blue-100',
    border: 'border-blue-200',
    title: 'text-blue-600',
    value: 'text-blue-800',
    subtitle: 'text-blue-600',
    iconBg: 'bg-blue-200',
    iconText: 'text-blue-700',
    skeleton: 'bg-blue-300'
  },
  indigo: {
    bg: 'bg-gradient-to-br from-indigo-50 to-indigo-100',
    border: 'border-indigo-200',
    title: 'text-indigo-600',
    value: 'text-indigo-800',
    subtitle: 'text-indigo-600',
    iconBg: 'bg-indigo-200',
    iconText: 'text-indigo-700',
    skeleton: 'bg-indigo-300'
  },
  amber: {
    bg: 'bg-gradient-to-br from-amber-50 to-amber-100',
    border: 'border-amber-200',
    title: 'text-amber-600',
    value: 'text-amber-800',
    subtitle: 'text-amber-600',
    iconBg: 'bg-amber-200',
    iconText: 'text-amber-700',
    skeleton: 'bg-amber-300'
  },
  emerald: {
    bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100',
    border: 'border-emerald-200',
    title: 'text-emerald-600',
    value: 'text-emerald-800',
    subtitle: 'text-emerald-600',
    iconBg: 'bg-emerald-200',
    iconText: 'text-emerald-700',
    skeleton: 'bg-emerald-300'
  },
  teal: {
    bg: 'bg-gradient-to-br from-teal-50 to-teal-100',
    border: 'border-teal-200',
    title: 'text-teal-600',
    value: 'text-teal-800',
    subtitle: 'text-teal-600',
    iconBg: 'bg-teal-200',
    iconText: 'text-teal-700',
    skeleton: 'bg-teal-300'
  },
  cyan: {
    bg: 'bg-gradient-to-br from-cyan-50 to-cyan-100',
    border: 'border-cyan-200',
    title: 'text-cyan-600',
    value: 'text-cyan-800',
    subtitle: 'text-cyan-600',
    iconBg: 'bg-cyan-200',
    iconText: 'text-cyan-700',
    skeleton: 'bg-cyan-300'
  },
  sky: {
    bg: 'bg-gradient-to-br from-sky-50 to-sky-100',
    border: 'border-sky-200',
    title: 'text-sky-600',
    value: 'text-sky-800',
    subtitle: 'text-sky-600',
    iconBg: 'bg-sky-200',
    iconText: 'text-sky-700',
    skeleton: 'bg-sky-300'
  },
  violet: {
    bg: 'bg-gradient-to-br from-violet-50 to-violet-100',
    border: 'border-violet-200',
    title: 'text-violet-600',
    value: 'text-violet-800',
    subtitle: 'text-violet-600',
    iconBg: 'bg-violet-200',
    iconText: 'text-violet-700',
    skeleton: 'bg-violet-300'
  },
  purple: {
    bg: 'bg-gradient-to-br from-purple-50 to-purple-100',
    border: 'border-purple-200',
    title: 'text-purple-600',
    value: 'text-purple-800',
    subtitle: 'text-purple-600',
    iconBg: 'bg-purple-200',
    iconText: 'text-purple-700',
    skeleton: 'bg-purple-300'
  },
  fuchsia: {
    bg: 'bg-gradient-to-br from-fuchsia-50 to-fuchsia-100',
    border: 'border-fuchsia-200',
    title: 'text-fuchsia-600',
    value: 'text-fuchsia-800',
    subtitle: 'text-fuchsia-600',
    iconBg: 'bg-fuchsia-200',
    iconText: 'text-fuchsia-700',
    skeleton: 'bg-fuchsia-300'
  },
  pink: {
    bg: 'bg-gradient-to-br from-pink-50 to-pink-100',
    border: 'border-pink-200',
    title: 'text-pink-600',
    value: 'text-pink-800',
    subtitle: 'text-pink-600',
    iconBg: 'bg-pink-200',
    iconText: 'text-pink-700',
    skeleton: 'bg-pink-300'
  },
  slate: {
    bg: 'bg-gradient-to-br from-slate-50 to-slate-100',
    border: 'border-slate-200',
    title: 'text-slate-600',
    value: 'text-slate-800',
    subtitle: 'text-slate-600',
    iconBg: 'bg-slate-200',
    iconText: 'text-slate-700',
    skeleton: 'bg-slate-300'
  },
  rose: {
    bg: 'bg-gradient-to-br from-rose-50 to-rose-100',
    border: 'border-rose-200',
    title: 'text-rose-600',
    value: 'text-rose-800',
    subtitle: 'text-rose-600',
    iconBg: 'bg-rose-200',
    iconText: 'text-rose-700',
    skeleton: 'bg-rose-300'
  },
  orange: {
    bg: 'bg-gradient-to-br from-orange-50 to-orange-100',
    border: 'border-orange-200',
    title: 'text-orange-600',
    value: 'text-orange-800',
    subtitle: 'text-orange-600',
    iconBg: 'bg-orange-200',
    iconText: 'text-orange-700',
    skeleton: 'bg-orange-300'
  },
  lime: {
    bg: 'bg-gradient-to-br from-lime-50 to-lime-100',
    border: 'border-lime-200',
    title: 'text-lime-600',
    value: 'text-lime-800',
    subtitle: 'text-lime-600',
    iconBg: 'bg-lime-200',
    iconText: 'text-lime-700',
    skeleton: 'bg-lime-300'
  }
};

function DashboardCard({ title, value, icon, color = 'blue', isLoading, error, onClick, subtitle }) {
  const colors = colorClasses[color] || colorClasses.blue;

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 p-6 rounded-lg shadow-md">
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          Failed to load
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`${colors.bg} p-6 rounded-lg shadow-md ${colors.border}`}>
        <div className="flex items-center justify-between">
          <div className={`h-4 ${colors.skeleton} rounded w-24 animate-pulse`}></div>
          <div className={`p-2 ${colors.iconBg} rounded-full animate-pulse`}>
            <div className={`w-5 h-5 ${colors.skeleton} rounded`}></div>
          </div>
        </div>
        <div className={`h-8 ${colors.skeleton} rounded w-20 mt-2 animate-pulse`}></div>
        {subtitle && <div className={`h-3 ${colors.skeleton} rounded w-16 mt-2 animate-pulse`}></div>}
      </div>
    );
  }

  return (
    <div 
      className={`${colors.bg} p-6 rounded-lg shadow-md ${colors.border} ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <h2 className={`${colors.title} text-sm font-medium`}>{title}</h2>
        <div className={`p-2 ${colors.iconBg} ${colors.iconText} rounded-full`}>
          {icon}
        </div>
      </div>
      <p className={`text-2xl md:text-3xl font-bold mt-2 ${colors.value} truncate`} title={value}>
        {value}
      </p>
      {subtitle && <p className={`text-xs ${colors.subtitle} mt-2`}>{subtitle}</p>}
    </div>
  );
}

export default DashboardCard;