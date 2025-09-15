'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Users, Shield, Plus, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { getAuthorizedEmails } from '@/lib/admin-auth'

export default function AdminManagePage() {
  return <AdminManageContent />
}

function AdminManageContent() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminCheckLoading, setAdminCheckLoading] = useState(true)
  const [authorizedEmails, setAuthorizedEmails] = useState<string[]>([])
  const [adminUsers, setAdminUsers] = useState<any[]>([])
  const { toast } = useToast()

  useEffect(() => {
    checkAdminStatus()
  }, [])

  const fetchAdminUsers = async () => {
    try {
      const response = await fetch('/api/admin/manage')
      const data = await response.json()
      
      if (response.ok && data.adminUsers) {
        setAdminUsers(data.adminUsers)
      }
    } catch (error) {
      console.error('Error fetching admin users:', error)
    }
  }

  async function checkAdminStatus() {
    try {
      const supabase = createClientComponentClient()
      
      // Check if current user is admin
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setIsAdmin(false)
        setAdminCheckLoading(false)
        return
      }
      
      // Check if user exists in admins table
      const { data: adminProfile, error: adminError } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", user.id)
        .single()
      
      // Check if there are any admins at all - if not, allow first admin to access
      const { data: allAdmins } = await supabase
        .from("admins")
        .select("user_id")
        .limit(1)
      
      if (adminError || !adminProfile) {
        if (!allAdmins || allAdmins.length === 0) {
          // No admins exist yet, allow first admin setup
          console.log('No admins exist yet, allowing first admin setup')
          setIsAdmin(true)
          setAuthorizedEmails([])
        } else {
          console.log('User is not admin, cannot access admin management')
          setIsAdmin(false)
        }
      } else {
        setIsAdmin(true)
        // Get the list of authorized admin emails
        getAuthorizedEmails().then(setAuthorizedEmails)
        // Fetch admin users from database
        fetchAdminUsers()
      }
    } catch (error) {
      console.error('Error checking admin status:', error)
      setIsAdmin(false)
    } finally {
      setAdminCheckLoading(false)
    }
  }

  const handleAddAdmin = async () => {
    if (!email.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/admin/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() })
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: `${email} has been granted admin access`,
          variant: "default"
        })
        setEmail('')
        // Refresh the list by fetching from API
        fetchAdminUsers()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to add admin user",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error adding admin:', error)
      toast({
        title: "Error",
        description: "Failed to add admin user",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Show loading state
  if (adminCheckLoading) {
    return (
      <div className="min-h-screen bg-cyber-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyber-cyan mx-auto mb-4"></div>
          <p className="text-gray-400">Checking your admin privileges...</p>
        </div>
      </div>
    )
  }

  // Show non-admin access message with sarcasm
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-cyber-black text-white flex items-center justify-center">
        <div className="text-center max-w-2xl mx-auto p-8">
          <div className="text-6xl mb-6">👑</div>
          <h1 className="text-4xl font-bold text-cyber-pink mb-4">Oh My, A Royal Visitor!</h1>
          <h2 className="text-2xl font-bold text-white mb-4">Admin Management Area</h2>
          <p className="text-gray-400 mb-6 text-lg">
            Look who thinks they can manage admin users! How precious. 
            Maybe you should start with managing your own expectations first? 😏
          </p>
          <div className="bg-cyber-dark/60 border border-cyber-pink/30 rounded-lg p-6 mb-6">
            <p className="text-cyber-pink font-mono text-sm">
              💡 <strong>Royal Decree:</strong> This area is reserved for actual administrators. 
              Your peasant status has been noted in the royal scrolls! 📜
            </p>
          </div>
          <div className="flex gap-4 justify-center">
            <a href="/" className="inline-block">
              <button className="bg-cyber-cyan hover:bg-cyber-cyan/80 text-black font-semibold px-6 py-3 rounded">
                ← Return to Peasant Life
              </button>
            </a>
            <a href="/profile" className="inline-block">
              <button className="border border-cyber-pink/30 text-cyber-pink hover:bg-cyber-pink/10 px-6 py-3 rounded">
                Petition for Nobility
              </button>
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cyber-black text-white px-6 pt-20 pb-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-cyber-cyan mb-2">Admin Management</h1>
          <p className="text-gray-400">Manage admin users and permissions</p>
        </div>

        {/* Add New Admin */}
        <Card className="bg-cyber-dark/60 border border-cyber-cyan/30 mb-8">
          <CardHeader>
            <CardTitle className="text-cyber-cyan flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add New Admin User
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-cyber-dark/40 border-cyber-cyan/30 text-white placeholder-gray-500 flex-1"
              />
              <Button
                onClick={handleAddAdmin}
                disabled={loading || !email.trim()}
                className="bg-cyber-cyan hover:bg-cyber-cyan/80 text-black font-semibold"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                    Adding...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Grant Admin Access
                  </>
                )}
              </Button>
            </div>
            <p className="text-sm text-gray-400 mt-2">
              The user will need to have an account and the email will be added to the authorized admin list.
            </p>
          </CardContent>
        </Card>

        {/* Current Admin Users */}
        <Card className="bg-cyber-dark/60 border border-cyber-cyan/30">
          <CardHeader>
            <CardTitle className="text-cyber-cyan flex items-center gap-2">
              <Users className="h-5 w-5" />
              Authorized Admin Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {adminUsers.map((admin, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-cyber-dark/40 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-cyber-cyan" />
                    <div>
                      <p className="font-medium text-white">{admin.email}</p>
                      <p className="text-sm text-gray-400">Authorized Admin</p>
                      <p className="text-xs text-gray-500">
                        Added: {new Date(admin.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-green-500 text-black font-semibold">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                </div>
              ))}
              
              {adminUsers.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <Shield className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                  <p>No authorized admin users found</p>
                </div>
              )}
            </div>
            
            <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <h4 className="font-semibold text-amber-400 mb-2">Important Notes:</h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Admin users must have an existing account in the system</li>
                <li>• The email must be added to the authorized list in the code</li>
                <li>• Changes require code deployment to take effect</li>
                <li>• Only authorized admins can access this page</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
