"use client"

import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollText, FileText, Upload, Store, Shield, AlertTriangle, Edit, Mail } from "lucide-react"

export default function TermsPage() {
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
                <ScrollText className="w-8 h-8 text-cyber-cyan" />
                Terms of Service
              </CardTitle>
              <p className="text-gray-400 mt-2">Effective Date: August 02, 2025</p>
            </CardHeader>
            <CardContent className="space-y-12 text-gray-300">
              {/* Section 1 - Acceptance of Terms */}
              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-cyber-cyan tracking-wider flex items-center gap-2">
                  <span className="text-cyber-pink">1.</span> Acceptance of Terms
                </h2>
                <div className="bg-cyber-dark/40 border-l-4 border-cyber-cyan p-4">
                  <p className="leading-relaxed text-white">
                    By accessing or using Cardify.club ("the Platform"), you agree to be bound by these Terms of
                    Service ("Terms"). If you do not agree, do not use the Platform.
                  </p>
                </div>
              </section>

              {/* Section 2 - User Content and Uploads */}
              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-cyber-cyan tracking-wider flex items-center gap-2">
                  <span className="text-cyber-pink">2.</span> User Content and Uploads
                </h2>
                <div className="flex gap-4 items-start">
                  <Upload className="w-5 h-5 text-purple-500 mt-1 flex-shrink-0" />
                  <div>
                    <p className="leading-relaxed">
                      Users are solely responsible for all content they upload, including but not limited to images, designs,
                      and text. By uploading content, you represent and warrant that:
                    </p>
                    <ul className="list-disc list-inside space-y-2 mt-3 ml-4">
                      <li className="text-white">You own all rights or have obtained all necessary permissions</li>
                      <li className="text-white">The content does not infringe on intellectual property rights</li>
                      <li className="text-white">The content does not violate publicity or privacy rights of any third party</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Section 3 - DMCA Policy */}
              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-cyber-cyan tracking-wider flex items-center gap-2">
                  <span className="text-cyber-pink">3.</span> DMCA Policy
                </h2>
                <div className="bg-cyber-dark/40 border-l-4 border-purple-500 p-4">
                  <div className="flex gap-3 items-start">
                    <Shield className="w-5 h-5 text-purple-400 mt-1 flex-shrink-0" />
                    <div>
                      <p className="leading-relaxed text-white">
                        Cardify.club complies with the Digital Millennium Copyright Act (DMCA). If you believe your
                        copyrighted work has been infringed, you may submit a notice to our DMCA agent at{" "}
                        <a href="mailto:dmca@cardify.club" className="text-cyber-cyan hover:text-cyber-pink transition-colors underline font-semibold">
                          dmca@cardify.club
                        </a>
                        . We reserve the right to remove infringing content and suspend repeat infringers.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 4 - Storefronts and Fulfillment */}
              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-cyber-cyan tracking-wider flex items-center gap-2">
                  <span className="text-cyber-pink">4.</span> Storefronts and Fulfillment
                </h2>
                <div className="flex gap-4 items-start">
                  <Store className="w-5 h-5 text-cyber-green mt-1 flex-shrink-0" />
                  <div>
                    <p className="leading-relaxed">
                      Cardify.club allows users to create personal storefronts. <span className="text-white font-semibold">Storefront owners are fully responsible for
                      the content they list and sell.</span> The Platform acts solely as a service provider for printing and order
                      fulfillment. We do not claim ownership of user content but reserve the right to remove any content at
                      our discretion.
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 5 - Indemnification */}
              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-cyber-cyan tracking-wider flex items-center gap-2">
                  <span className="text-cyber-pink">5.</span> Indemnification
                </h2>
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                  <div className="flex gap-3 items-start">
                    <FileText className="w-5 h-5 text-amber-400 mt-1 flex-shrink-0" />
                    <p className="leading-relaxed text-white">
                      You agree to indemnify and hold harmless Cardify.club, its owners, affiliates, and employees from
                      any claims, damages, or legal fees arising from your use of the Platform or any content you upload
                      or sell.
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 6 - Limitation of Liability */}
              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-cyber-cyan tracking-wider flex items-center gap-2">
                  <span className="text-cyber-pink">6.</span> Limitation of Liability
                </h2>
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <div className="flex gap-3 items-start">
                    <AlertTriangle className="w-5 h-5 text-red-400 mt-1 flex-shrink-0" />
                    <p className="leading-relaxed text-white">
                      Cardify.club is not liable for any direct, indirect, incidental, or consequential damages resulting from
                      your use of the Platform. We provide the Platform <span className="text-cyber-pink font-semibold">'as is'</span> without 
                      warranties of any kind.
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 7 - Changes to Terms */}
              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-cyber-cyan tracking-wider flex items-center gap-2">
                  <span className="text-cyber-pink">7.</span> Changes to Terms
                </h2>
                <div className="flex gap-4 items-start">
                  <Edit className="w-5 h-5 text-cyber-cyan mt-1 flex-shrink-0" />
                  <p className="leading-relaxed">
                    We reserve the right to modify these Terms at any time. Continued use of the Platform after
                    changes constitutes acceptance of the new Terms.
                  </p>
                </div>
              </section>

              {/* Section 8 - Contact */}
              <section className="border-t border-cyber-cyan/20 pt-8">
                <div className="bg-cyber-dark/80 border border-cyber-cyan/30 rounded-lg p-6 text-center">
                  <h3 className="text-lg font-bold text-white mb-3">Contact Us</h3>
                  <p className="text-gray-300 mb-4">For any questions about these Terms, please contact:</p>
                  <a 
                    href="mailto:support@cardify.club" 
                    className="inline-flex items-center gap-2 text-cyber-cyan hover:text-cyber-pink transition-colors text-lg font-semibold"
                  >
                    <Mail className="w-5 h-5" />
                    support@cardify.club
                  </a>
                </div>
              </section>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}