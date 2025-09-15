"use client"

import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, User, CreditCard, Store, Share2, Lock, UserCheck, Globe, Mail } from "lucide-react"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-cyber-black relative overflow-hidden font-mono">
      {/* Background Effects */}
      <div className="fixed inset-0 cyber-grid opacity-10 pointer-events-none" />
      <div className="fixed inset-0 scanlines opacity-20 pointer-events-none" />

      <Navigation />

      <div className="px-6 py-8 pt-24 pb-20 relative">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-cyber-dark/60 backdrop-blur-sm border border-cyber-cyan/30">
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-white tracking-wider flex items-center gap-3">
                <Shield className="w-8 h-8 text-cyber-cyan" />
                Privacy Policy
              </CardTitle>
              <p className="text-gray-400 mt-2">Effective Date: January 10, 2025</p>
            </CardHeader>
            <CardContent className="space-y-12 text-gray-300">
              {/* Introduction */}
              <section className="space-y-4">
                <div className="bg-cyber-dark/40 border-l-4 border-cyber-cyan p-4">
                  <p className="leading-relaxed text-white">
                    Cardify LLC ("Cardify," "we," "our," or "us") values your privacy. This Privacy Policy explains how we collect, 
                    use, and protect your information when you use our website, marketplace, and related services (collectively, the "Services").
                  </p>
                </div>
              </section>

              {/* Section 1 - Information We Collect */}
              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-cyber-cyan tracking-wider flex items-center gap-2">
                  <span className="text-cyber-pink">1.</span> Information We Collect
                </h2>
                
                {/* 1.1 Account Information */}
                <div className="ml-6 space-y-4">
                  <h3 className="text-lg font-semibold text-purple-400 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    1.1 Account Information
                  </h3>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li className="text-white">When you sign in with Google, we receive your name, email address, and profile image.</li>
                    <li className="text-white">You may add additional information to your profile, such as a display name or store details.</li>
                  </ul>
                </div>

                {/* 1.2 Orders & Payments */}
                <div className="ml-6 space-y-4">
                  <h3 className="text-lg font-semibold text-purple-400 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    1.2 Orders & Payments
                  </h3>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li className="text-white">To process orders, we collect your name, shipping address, and order details.</li>
                    <li className="text-white">Payment information is handled securely by our payment processor (e.g., Stripe) and is not stored on our servers.</li>
                  </ul>
                </div>

                {/* 1.3 Marketplace Listings */}
                <div className="ml-6 space-y-4">
                  <h3 className="text-lg font-semibold text-purple-400 flex items-center gap-2">
                    <Store className="w-4 h-4" />
                    1.3 Marketplace Listings
                  </h3>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li className="text-white">If you list items for sale, we collect the information you provide (title, description, images, pricing).</li>
                    <li className="text-white">Seller payout details (such as bank account or Stripe account) are collected by our payment processor.</li>
                  </ul>
                </div>

                {/* 1.4 Technical Information */}
                <div className="ml-6 space-y-4">
                  <h3 className="text-lg font-semibold text-purple-400">1.4 Technical Information</h3>
                  <p className="ml-4">
                    We automatically collect information like IP addresses, browser type, and device identifiers to operate and secure our Services.
                  </p>
                </div>
              </section>

              {/* Section 2 - How We Use Information */}
              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-cyber-cyan tracking-wider flex items-center gap-2">
                  <span className="text-cyber-pink">2.</span> How We Use Information
                </h2>
                <div className="bg-cyber-dark/40 border-l-4 border-purple-500 p-4">
                  <p className="mb-3">We use your information to:</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li className="text-white">Create and manage your Cardify account.</li>
                    <li className="text-white">Process and deliver orders.</li>
                    <li className="text-white">Enable marketplace listings and payouts.</li>
                    <li className="text-white">Communicate with you regarding updates, orders, or support.</li>
                    <li className="text-white">Monitor and improve the security and performance of our Services.</li>
                  </ul>
                </div>
              </section>

              {/* Section 3 - How We Share Information */}
              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-cyber-cyan tracking-wider flex items-center gap-2">
                  <span className="text-cyber-pink">3.</span> How We Share Information
                </h2>
                <div className="flex gap-4 items-start">
                  <Share2 className="w-5 h-5 text-cyber-green mt-1 flex-shrink-0" />
                  <div>
                    <p className="mb-3">We only share your information in limited circumstances:</p>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li className="text-white">Payment processors (e.g., Stripe) for handling transactions and payouts.</li>
                      <li className="text-white">Shipping providers to deliver your orders.</li>
                      <li className="text-white">Service providers who help us operate the website and marketplace.</li>
                      <li className="text-white">Legal compliance if required by law, regulation, or valid legal process.</li>
                    </ul>
                    <p className="mt-4 text-cyber-yellow font-semibold">We do not sell your personal information.</p>
                  </div>
                </div>
              </section>

              {/* Section 4 - Your Choices */}
              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-cyber-cyan tracking-wider flex items-center gap-2">
                  <span className="text-cyber-pink">4.</span> Your Choices
                </h2>
                <div className="bg-cyber-dark/40 border-l-4 border-cyber-cyan p-4">
                  <ul className="list-disc list-inside space-y-2">
                    <li className="text-white">You may update or delete your profile information in your account settings.</li>
                    <li className="text-white">You may request access, correction, or deletion of your data by contacting us at{" "}
                      <a href="mailto:support@cardify.club" className="text-cyber-cyan hover:text-cyber-pink transition-colors underline">
                        support@cardify.club
                      </a>.
                    </li>
                    <li className="text-white">You may disconnect your Google account login at any time.</li>
                  </ul>
                </div>
              </section>

              {/* Section 5 - Data Security */}
              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-cyber-cyan tracking-wider flex items-center gap-2">
                  <span className="text-cyber-pink">5.</span> Data Security
                </h2>
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                  <div className="flex gap-3 items-start">
                    <Lock className="w-5 h-5 text-amber-400 mt-1 flex-shrink-0" />
                    <p className="leading-relaxed text-white">
                      We use industry-standard safeguards to protect your information. However, no method of transmission or storage is 100% secure.
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 6 - Children's Privacy */}
              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-cyber-cyan tracking-wider flex items-center gap-2">
                  <span className="text-cyber-pink">6.</span> Children's Privacy
                </h2>
                <div className="flex gap-4 items-start">
                  <UserCheck className="w-5 h-5 text-purple-400 mt-1 flex-shrink-0" />
                  <p className="leading-relaxed">
                    Cardify is not directed at children under 13. If we discover that we have collected personal information from a child, we will delete it.
                  </p>
                </div>
              </section>

              {/* Section 7 - International Users */}
              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-cyber-cyan tracking-wider flex items-center gap-2">
                  <span className="text-cyber-pink">7.</span> International Users
                </h2>
                <div className="flex gap-4 items-start">
                  <Globe className="w-5 h-5 text-cyber-cyan mt-1 flex-shrink-0" />
                  <p className="leading-relaxed">
                    If you access our Services from outside the United States, you agree to the transfer and processing of your information in the U.S.
                  </p>
                </div>
              </section>

              {/* Section 8 - Changes to This Policy */}
              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-cyber-cyan tracking-wider flex items-center gap-2">
                  <span className="text-cyber-pink">8.</span> Changes to This Policy
                </h2>
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <p className="leading-relaxed text-white">
                    We may update this Privacy Policy from time to time. We will post the updated version on our website with a new "Effective Date."
                  </p>
                </div>
              </section>

              {/* Section 9 - Contact Us */}
              <section className="border-t border-cyber-cyan/20 pt-8">
                <div className="bg-cyber-dark/80 border border-cyber-cyan/30 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-white mb-4">9. Contact Us</h3>
                  <p className="text-gray-300 mb-4">If you have questions about this Privacy Policy, contact us at:</p>
                  <div className="space-y-2 text-center">
                    <p className="text-white font-semibold">Cardify LLC</p>
                    <a 
                      href="mailto:support@cardify.club" 
                      className="inline-flex items-center gap-2 text-cyber-cyan hover:text-cyber-pink transition-colors text-lg font-semibold"
                    >
                      <Mail className="w-5 h-5" />
                      support@cardify.club
                    </a>
                  </div>
                </div>
              </section>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}