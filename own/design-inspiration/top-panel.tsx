"use client"

import { useState } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

interface TopPanelProps {
  selectedItem: string
}

export default function TopPanel({ selectedItem }: TopPanelProps) {
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <div className="bg-black border-b border-gray-800 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-black text-xs font-bold">IG</span>
            </div>
            <h1 className="text-xl font-semibold text-white">Influence Graph</h1>
            <span className="text-sm text-gray-400">Explore how everything influences everything</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder={`Search influences for ${selectedItem}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-80 bg-gray-900 border-gray-800 text-gray-100 placeholder-gray-500 focus:border-green-500 focus:ring-green-500/20"
            />
          </div>
          <span className="text-xs text-gray-500">v1.0.0</span>
        </div>
      </div>
    </div>
  )
}
