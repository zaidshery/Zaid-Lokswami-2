'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Video, 
  Users, 
  Eye, 
  TrendingUp, 
  Activity,
  MessageSquare,
  ArrowUpRight,
  ArrowDownRight,
  Plus
} from 'lucide-react';
import { articles, videos } from '@/lib/mock/data';
import formatNumber from '@/lib/utils/formatNumber';

const stats = [
  { 
    label: 'Total Articles', 
    value: '1,234', 
    icon: FileText, 
    change: '+12%', 
    trend: 'up',
    color: 'bg-blue-500/20 text-blue-600'
  },
  { 
    label: 'Total Videos', 
    value: '456', 
    icon: Video, 
    change: '+8%', 
    trend: 'up',
    color: 'bg-purple-500/20 text-purple-600'
  },
  { 
    label: 'Total Users', 
    value: '89.2K', 
    icon: Users, 
    change: '+23%', 
    trend: 'up',
    color: 'bg-green-500/20 text-green-600'
  },
  { 
    label: 'Page Views', 
    value: '2.4M', 
    icon: Eye, 
    change: '-5%', 
    trend: 'down',
    color: 'bg-orange-500/20 text-orange-600'
  },
];

const uploadOptions = [
  { label: 'Upload Article', icon: FileText, href: '/admin/articles/new', color: 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20' },
  { label: 'Create Story', icon: Eye, href: '/admin/stories/new', color: 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20' },
  { label: 'Upload Video', icon: Video, href: '/admin/videos/new', color: 'bg-purple-500/10 text-purple-600 hover:bg-purple-500/20' },
  { label: 'Manage E-Papers', icon: FileText, href: '/admin/epapers', color: 'bg-orange-500/10 text-orange-600 hover:bg-orange-500/20' },
  { label: 'Contact Inbox', icon: MessageSquare, href: '/admin/contact-messages', color: 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20' },
];

const recentArticles = articles.slice(0, 5);
const recentVideos = videos.slice(0, 3);

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      {/* Quick Upload Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5"
      >
        {uploadOptions.map((option, index) => {
          const Icon = option.icon;
          return (
            <Link key={option.href} href={option.href}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-6 rounded-xl border border-gray-200 shadow-sm transition-all hover:shadow-md cursor-pointer ${option.color}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${option.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{option.label}</p>
                    <p className="text-xs text-gray-500 mt-1">Add new content</p>
                  </div>
                  <Plus className="w-5 h-5 ml-auto opacity-50" />
                </div>
              </motion.div>
            </Link>
          );
        })}
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-4">
              {stat.trend === 'up' ? (
                <ArrowUpRight className="w-4 h-4 text-green-600" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-red-600" />
              )}
              <span className={`text-sm font-semibold ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {stat.change}
              </span>
              <span className="text-sm text-gray-500">vs last month</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Chart Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary-600" />
              Traffic Overview
            </h3>
            <select className="px-3 py-1 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors">
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>Last 90 days</option>
            </select>
          </div>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-200">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Traffic chart will be displayed here</p>
            </div>
          </div>
        </motion.div>

        {/* Popular Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-600" />
              Popular Content
            </h3>
          </div>
          <div className="space-y-4">
            {recentArticles.slice(0, 4).map((article, index) => (
              <div key={article.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <span className="text-lg font-bold text-primary-600">#{index + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 font-medium truncate">{article.title}</p>
                  <p className="text-xs text-gray-500">{formatNumber(article.views)} views</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Articles */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Articles</h3>
            <a href="/admin/articles" className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors">View All</a>
          </div>
          <div className="space-y-3">
            {recentArticles.map((article) => (
              <div key={article.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 font-medium truncate">{article.title}</p>
                  <p className="text-xs text-gray-500">{article.category} • {article.author.name}</p>
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                  {new Date(article.publishedAt).toLocaleDateString('en-GB')}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent Videos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Videos</h3>
            <a href="/admin/videos/new" className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors">Upload New</a>
          </div>
          <div className="space-y-3">
            {recentVideos.map((video) => (
              <div key={video.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 font-medium truncate">{video.title}</p>
                  <p className="text-xs text-gray-500">{video.category} • {formatNumber(video.views)} views</p>
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                  {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
