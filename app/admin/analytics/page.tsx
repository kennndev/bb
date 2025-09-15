'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertTriangle, CheckCircle, XCircle, Users, Upload, ShoppingCart, Sparkles, Eye, Shield, Loader2, DollarSign, Calendar, User, Mail, Phone, ArrowLeft, Filter, Search } from "lucide-react"
import Link from "next/link"

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [revenueRequests, setRevenueRequests] = useState<any[]>([])
  const [filteredRequests, setFilteredRequests] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    loadRevenueRequests()
  }, [])

  useEffect(() => {
    filterRequests()
  }, [revenueRequests, statusFilter, searchTerm])

  async function loadRevenueRequests() {
    try {
      setLoading(true)
      
      // Check if current user is admin using admins table
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      // Check if user exists in admins table
      const { data: adminProfile, error: adminError } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", user.id)
        .single()
      
      if (adminError || !adminProfile) {
        setError('Admin access required')
        return
      }

      // Fetch revenue requests
      const { data: requests, error: requestsError } = await supabase
        .from("revenue_requests")
        .select("*")
        .order('created_at', { ascending: false })

      if (requestsError) {
        console.error('Error loading revenue requests:', requestsError)
        setError('Failed to load revenue requests')
        return
      }

      // Fetch user profiles separately
      if (requests && requests.length > 0) {
        const userIds = [...new Set(requests.map(req => req.user_id))]
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, display_name, email, avatar_url")
          .in('id', userIds)

        if (profilesError) {
          console.error('Error loading profiles:', profilesError)
        }

        // Combine revenue requests with profile data
        const enrichedRequests = requests.map(request => ({
          ...request,
          profiles: profiles?.find(profile => profile.id === request.user_id) || null
        }))

        setRevenueRequests(enrichedRequests)
      } else {
        setRevenueRequests(requests || [])
      }

      console.log('🔍 Revenue requests loaded:', requests?.length || 0)
      
    } catch (error) {
      console.error('Error in analytics:', error)
      setError('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  function filterRequests() {
    let filtered = [...revenueRequests]

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(req => req.status === statusFilter)
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(req => 
        req.profiles?.display_name?.toLowerCase().includes(term) ||
        req.profiles?.email?.toLowerCase().includes(term) ||
        req.id.toLowerCase().includes(term) ||
        req.request_type.toLowerCase().includes(term)
      )
    }

    setFilteredRequests(filtered)
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500 text-white">Completed</Badge>
      case 'pending':
        return <Badge className="bg-amber-500 text-white">Pending</Badge>
      case 'failed':
        return <Badge className="bg-red-500 text-white">Failed</Badge>
      default:
        return <Badge className="bg-gray-500 text-white">{status}</Badge>
    }
  }

  function getRequestTypeIcon(type: string) {
    switch (type) {
      case 'revenue_conversion':
        return <DollarSign className="h-4 w-4 text-green-400" />
      case 'stripe_payment':
        return <Shield className="h-4 w-4 text-blue-400" />
      default:
        return <DollarSign className="h-4 w-4 text-gray-400" />
    }
  }

  function formatAmount(amountCents: number) {
    return `$${(amountCents / 100).toFixed(2)}`
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function parseContactInfo(contactInfo: string) {
    try {
      return JSON.parse(contactInfo)
    } catch {
      return {}
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cyber-black text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-cyber-cyan animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-cyber-black text-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Analytics Error</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <Link href="/admin">
            <Button className="bg-cyber-cyan hover:bg-cyber-cyan/80 text-black">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const totalAmount = filteredRequests.reduce((sum, req) => sum + (req.amount_cents || 0), 0)
  const completedAmount = filteredRequests
    .filter(req => req.status === 'completed')
    .reduce((sum, req) => sum + (req.amount_cents || 0), 0)
  const pendingAmount = filteredRequests
    .filter(req => req.status === 'pending')
    .reduce((sum, req) => sum + (req.amount_cents || 0), 0)

  return (
    <div className="min-h-screen bg-cyber-black text-white px-6 pt-20 pb-10">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="text-cyber-cyan hover:text-cyber-cyan/80">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
            <h1 className="text-4xl font-bold text-cyber-cyan mb-2">Revenue Analytics</h1>
            <p className="text-gray-400">Detailed analysis of revenue requests and payments</p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-cyber-dark/60 border border-cyber-cyan/30">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-cyber-cyan">
                {filteredRequests.length}
              </div>
              <p className="text-sm text-gray-400">Total Requests</p>
            </CardContent>
          </Card>
          <Card className="bg-cyber-dark/60 border border-green-500/30">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-400">
                {formatAmount(totalAmount)}
              </div>
              <p className="text-sm text-gray-400">Total Amount</p>
            </CardContent>
          </Card>
          <Card className="bg-cyber-dark/60 border border-green-500/30">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-400">
                {formatAmount(completedAmount)}
              </div>
              <p className="text-sm text-gray-400">Completed</p>
            </CardContent>
          </Card>
          <Card className="bg-cyber-dark/60 border border-amber-500/30">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-amber-400">
                {formatAmount(pendingAmount)}
              </div>
              <p className="text-sm text-gray-400">Pending</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-cyber-dark/60 border border-cyber-cyan/30 mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Search className="h-4 w-4 text-cyber-cyan" />
                  <label className="text-sm font-medium text-gray-300">Search</label>
                </div>
                <Input
                  placeholder="Search by name, email, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-cyber-dark/40 border-cyber-cyan/30 text-white placeholder-gray-500"
                />
              </div>
              <div className="w-full md:w-48">
                <div className="flex items-center gap-2 mb-2">
                  <Filter className="h-4 w-4 text-cyber-cyan" />
                  <label className="text-sm font-medium text-gray-300">Status</label>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-cyber-dark/40 border-cyber-cyan/30 text-cyber-cyan">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent className="bg-cyber-dark border-cyber-cyan/30">
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={loadRevenueRequests}
                  variant="outline"
                  className="border-cyber-cyan/30 text-cyber-cyan hover:bg-cyber-cyan/10"
                >
                  <div className="h-4 w-4 mr-2">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Requests List */}
        <div className="space-y-4">
                     {filteredRequests.map((request) => {
             const contactInfo = parseContactInfo(request.contact_info || '{}')
             const metadata = request.metadata || {}
            
            return (
              <Card key={request.id} className="bg-cyber-dark/60 border border-cyber-cyan/30">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getRequestTypeIcon(request.request_type)}
                      <div>
                        <CardTitle className="text-white text-lg">
                          {request.request_type === 'revenue_conversion' ? 'Revenue Conversion' : 'Stripe Payment'}
                        </CardTitle>
                        <p className="text-sm text-gray-400">
                          Request ID: {request.id.slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-cyber-cyan mb-1">
                        {formatAmount(request.amount_cents)}
                      </div>
                      {getStatusBadge(request.status)}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* User Information */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-cyber-cyan flex items-center gap-2">
                        <User className="h-4 w-4" />
                        User Information
                      </h4>
                      
                      {request.profiles ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 w-20">Name:</span>
                            <span className="text-white">{request.profiles.display_name || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-400 w-20">Email:</span>
                            <span className="text-white">{request.profiles.email || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 w-20">User ID:</span>
                            <span className="text-white font-mono text-sm">{request.user_id.slice(0, 8)}...</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-400">User profile not found</p>
                      )}
                    </div>

                    {/* Payment Details */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-cyber-pink flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Payment Details
                      </h4>
                      
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 w-24">Type:</span>
                          <Badge variant="outline" className="text-cyber-pink border-cyber-pink/30">
                            {request.request_type === 'revenue_conversion' ? 'Revenue Conversion' : 'Stripe Payment'}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 w-24">Amount:</span>
                          <span className="text-white font-semibold">{formatAmount(request.amount_cents)}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 w-24">Status:</span>
                          {getStatusBadge(request.status)}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-400 w-24">Created:</span>
                          <span className="text-white">{formatDate(request.created_at)}</span>
                        </div>
                        
                        {request.updated_at && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-400 w-24">Updated:</span>
                            <span className="text-white">{formatDate(request.updated_at)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contact Information (for Stripe payments) */}
                  {request.request_type === 'stripe_payment' && Object.keys(contactInfo).length > 0 && (
                    <div className="mt-6 pt-6 border-t border-cyber-cyan/30">
                      <h4 className="font-semibold text-cyber-green flex items-center gap-2 mb-3">
                        <Shield className="h-4 w-4" />
                        Stripe Contact Information
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {contactInfo.name && (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-400 w-20">Name:</span>
                            <span className="text-white">{contactInfo.name}</span>
                          </div>
                        )}
                        
                        {contactInfo.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-400 w-20">Email:</span>
                            <span className="text-white">{contactInfo.email}</span>
                          </div>
                        )}
                        
                        {contactInfo.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-400 w-20">Phone:</span>
                            <span className="text-white">{contactInfo.phone}</span>
                          </div>
                        )}
                        
                        {contactInfo.stripe_account && (
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-400 w-20">Stripe Account:</span>
                            <span className="text-white font-mono text-sm">{contactInfo.stripe_account}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Metadata (for revenue conversions) */}
                  {request.request_type === 'revenue_conversion' && Object.keys(metadata).length > 0 && (
                    <div className="mt-6 pt-6 border-t border-cyber-cyan/30">
                      <h4 className="font-semibold text-cyber-green flex items-center gap-2 mb-3">
                        <Sparkles className="h-4 w-4" />
                        Conversion Details
                      </h4>
                      
                      <div className="space-y-2">
                        {metadata.credits_added && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 w-24">Credits Added:</span>
                            <Badge variant="outline" className="text-green-400 border-green-400/30">
                              {metadata.credits_added}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Empty State */}
        {filteredRequests.length === 0 && (
          <Card className="bg-cyber-dark/60 border border-cyber-cyan/30">
            <CardContent className="p-12 text-center">
              <DollarSign className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Revenue Requests Found</h3>
              <p className="text-gray-400">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your filters or search terms.' 
                  : 'No revenue requests have been created yet.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
