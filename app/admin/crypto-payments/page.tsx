'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RefreshCw, Download, Search } from 'lucide-react'

interface CryptoPayment {
  id: string
  order_id: string
  company: string | null
  address: string
  address_line_2: string | null
  city: string
  state: string
  zipcode: string
  country: string
  order_items: string | null
  pounds: number | null
  length: number | null
  width: number | null
  height: number | null
  amount_cents: number
  base_amount_cents: number
  tax_amount_cents: number
  tax_rate_percentage: number
  status: string
  transaction_hash: string | null
  created_at: string
  confirmed_at: string | null
}

export default function CryptoPaymentsAdmin() {
  const [payments, setPayments] = useState<CryptoPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingRow, setEditingRow] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<CryptoPayment>>({})
  
  const supabase = createClientComponentClient()

  const fetchPayments = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('crypto_payments')
        .select(`
          id,
          order_id,
          company,
          address,
          address_line_2,
          city,
          state,
          zipcode,
          country,
          order_items,
          pounds,
          length,
          width,
          height,
          amount_cents,
          base_amount_cents,
          tax_amount_cents,
          tax_rate_percentage,
          status,
          transaction_hash,
          created_at,
          confirmed_at
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPayments(data || [])
    } catch (error) {
      console.error('Error fetching payments:', error)
    } finally {
      setLoading(false)
    }
  }

  const updatePackageDimensions = async (id: string) => {
    try {
      const { error } = await supabase
        .from('crypto_payments')
        .update({
          pounds: editData.pounds,
          length: editData.length,
          width: editData.width,
          height: editData.height,
        })
        .eq('id', id)

      if (error) throw error
      
      setEditingRow(null)
      setEditData({})
      fetchPayments()
    } catch (error) {
      console.error('Error updating dimensions:', error)
    }
  }

  const exportToCSV = () => {
    const headers = [
      'Order ID', 'Company', 'Address', 'Address Line 2', 'City', 'State', 
      'Zipcode', 'Country', 'Order Items', 'Pounds', 'Length', 'Width', 'Height',
      'Amount', 'Tax Rate', 'Status', 'Transaction Hash', 'Created At'
    ]
    
    const csvData = payments.map(payment => [
      payment.order_id,
      payment.company || '',
      payment.address,
      payment.address_line_2 || '',
      payment.city,
      payment.state,
      payment.zipcode,
      payment.country,
      payment.order_items || '',
      payment.pounds || '',
      payment.length || '',
      payment.width || '',
      payment.height || '',
      `$${(payment.amount_cents / 100).toFixed(2)}`,
      `${payment.tax_rate_percentage}%`,
      payment.status,
      payment.transaction_hash || '',
      new Date(payment.created_at).toLocaleDateString()
    ])
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `crypto-payments-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  useEffect(() => {
    fetchPayments()
  }, [])

  const filteredPayments = payments.filter(payment =>
    payment.order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.country.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Crypto Payments - Order Management</span>
            <div className="flex gap-2">
              <Button onClick={fetchPayments} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={exportToCSV} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by Order ID, Company, City, or Country..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-3 py-2 text-left">Order ID</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Company</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Address</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Address Line 2</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">City</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">State</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Zipcode</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Country</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Order Items</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Pounds</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Length</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Width</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Height</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Amount</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Tax Rate</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={16} className="border border-gray-300 px-3 py-8 text-center">
                      Loading payments...
                    </td>
                  </tr>
                ) : filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={16} className="border border-gray-300 px-3 py-8 text-center">
                      No payments found
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-3 py-2 font-mono text-sm">
                        {payment.order_id}
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        {payment.company || '-'}
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        {payment.address}
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        {payment.address_line_2 || '-'}
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        {payment.city}
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        {payment.state}
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        {payment.zipcode}
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        {payment.country}
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        {payment.order_items || '-'}
                      </td>
                      
                      {/* Package Dimensions - Editable */}
                      <td className="border border-gray-300 px-3 py-2">
                        {editingRow === payment.id ? (
                          <Input
                            type="number"
                            step="0.1"
                            value={editData.pounds || ''}
                            onChange={(e) => setEditData({...editData, pounds: parseFloat(e.target.value) || null})}
                            className="w-20 h-8"
                          />
                        ) : (
                          <span onClick={() => {
                            setEditingRow(payment.id)
                            setEditData({
                              pounds: payment.pounds,
                              length: payment.length,
                              width: payment.width,
                              height: payment.height
                            })
                          }} className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded">
                            {payment.pounds || 'Click to add'}
                          </span>
                        )}
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        {editingRow === payment.id ? (
                          <Input
                            type="number"
                            step="0.1"
                            value={editData.length || ''}
                            onChange={(e) => setEditData({...editData, length: parseFloat(e.target.value) || null})}
                            className="w-20 h-8"
                          />
                        ) : (
                          <span onClick={() => {
                            setEditingRow(payment.id)
                            setEditData({
                              pounds: payment.pounds,
                              length: payment.length,
                              width: payment.width,
                              height: payment.height
                            })
                          }} className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded">
                            {payment.length || 'Click to add'}
                          </span>
                        )}
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        {editingRow === payment.id ? (
                          <Input
                            type="number"
                            step="0.1"
                            value={editData.width || ''}
                            onChange={(e) => setEditData({...editData, width: parseFloat(e.target.value) || null})}
                            className="w-20 h-8"
                          />
                        ) : (
                          <span onClick={() => {
                            setEditingRow(payment.id)
                            setEditData({
                              pounds: payment.pounds,
                              length: payment.length,
                              width: payment.width,
                              height: payment.height
                            })
                          }} className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded">
                            {payment.width || 'Click to add'}
                          </span>
                        )}
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        {editingRow === payment.id ? (
                          <div className="flex gap-1">
                            <Input
                              type="number"
                              step="0.1"
                              value={editData.height || ''}
                              onChange={(e) => setEditData({...editData, height: parseFloat(e.target.value) || null})}
                              className="w-20 h-8"
                            />
                            <Button
                              size="sm"
                              onClick={() => updatePackageDimensions(payment.id)}
                              className="h-8 px-2"
                            >
                              Save
                            </Button>
                          </div>
                        ) : (
                          <span onClick={() => {
                            setEditingRow(payment.id)
                            setEditData({
                              pounds: payment.pounds,
                              length: payment.length,
                              width: payment.width,
                              height: payment.height
                            })
                          }} className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded">
                            {payment.height || 'Click to add'}
                          </span>
                        )}
                      </td>
                      
                      <td className="border border-gray-300 px-3 py-2 font-mono text-sm">
                        ${(payment.amount_cents / 100).toFixed(2)}
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        {payment.tax_rate_percentage}%
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          payment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          payment.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {payment.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
