"use client"

import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Mail, Clock, AlertTriangle, FileText, Scale } from "lucide-react"

export default function DMCAPage() {
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
                DMCA Policy
              </CardTitle>
              <p className="text-gray-400 mt-2">Digital Millennium Copyright Act Compliance</p>
            </CardHeader>
            <CardContent className="space-y-12 text-gray-300">
              {/* Section 1 - Overview */}
              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-cyber-cyan tracking-wider flex items-center gap-2">
                  <span className="text-cyber-pink">1.</span> Overview
                </h2>
                <p className="leading-relaxed">
                  Cardify, LLC ("Cardify") respects intellectual property rights and complies with the U.S. Digital 
                  Millennium Copyright Act (17 U.S.C. §512). This page explains how copyright owners can submit a DMCA 
                  takedown notice, how sellers can submit a counter-notification, and how Cardify handles repeat infringers.
                </p>
                <div className="bg-cyber-dark/80 border border-cyber-cyan/20 rounded-lg p-4 mt-4">
                  <p className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-cyber-cyan" />
                    Email is accepted at:{" "}
                    <a href="mailto:dmca@cardify.club" className="text-cyber-cyan hover:text-cyber-pink transition-colors underline font-semibold">
                      dmca@cardify.club
                    </a>
                  </p>
                </div>
              </section>

              {/* Section 2 - Submit a DMCA Takedown Notice */}
              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-cyber-cyan tracking-wider flex items-center gap-2">
                  <span className="text-cyber-pink">2.</span> Submit a DMCA Takedown Notice
                </h2>
                <p className="leading-relaxed">
                  To be valid under §512(c)(3), your notice must include <span className="text-cyber-pink font-semibold">all</span> of the following:
                </p>
                <div className="bg-cyber-dark/40 border-l-4 border-cyber-cyan p-4 space-y-3">
                  <ol className="list-decimal list-inside space-y-3 ml-2">
                    <li className="leading-relaxed">
                      <span className="text-white">Your full legal name, mailing address, telephone number, and email address.</span>
                    </li>
                    <li className="leading-relaxed">
                      <span className="text-white">Identification of the copyrighted work (or a representative list, if multiple).</span>
                    </li>
                    <li className="leading-relaxed">
                      <span className="text-white">Identification of the material you claim is infringing and its location on Cardify 
                      (exact URL(s) to the listing or page).</span>
                    </li>
                    <li className="leading-relaxed">
                      <span className="text-white">A statement that you have a good-faith belief that the disputed use is not 
                      authorized by the copyright owner, its agent, or the law.</span>
                    </li>
                    <li className="leading-relaxed">
                      <span className="text-white">A statement that the information in your notice is accurate, and 
                      <span className="text-cyber-pink font-semibold"> under penalty of perjury</span>, that you are the owner 
                      or authorized to act on the owner's behalf.</span>
                    </li>
                    <li className="leading-relaxed">
                      <span className="text-white">Your physical or electronic signature.</span>
                    </li>
                  </ol>
                </div>
                <div className="mt-4 bg-cyber-dark/80 border border-cyber-cyan/20 rounded-lg p-4">
                  <p className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-cyber-cyan" />
                    <span className="text-sm">Submit takedown notices to:{" "}
                    <a href="mailto:dmca@cardify.club" className="text-cyber-cyan hover:text-cyber-pink transition-colors underline font-semibold">
                      dmca@cardify.club
                    </a>
                    </span>
                  </p>
                </div>
              </section>

              {/* Section 3 - Counter-Notification */}
              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-cyber-cyan tracking-wider flex items-center gap-2">
                  <span className="text-cyber-pink">3.</span> Counter-Notification (for Sellers)
                </h2>
                <p className="leading-relaxed">
                  If your content was removed due to a DMCA notice and you believe it was a mistake or misidentification, 
                  you may file a counter-notification under §512(g). Your counter-notice must include:
                </p>
                <div className="bg-cyber-dark/40 border-l-4 border-purple-500 p-4 space-y-3">
                  <ol className="list-decimal list-inside space-y-3 ml-2">
                    <li className="leading-relaxed">
                      <span className="text-white">Your full legal name, mailing address, phone, and email.</span>
                    </li>
                    <li className="leading-relaxed">
                      <span className="text-white">Identification of the material that was removed and where it appeared 
                      before removal (URL).</span>
                    </li>
                    <li className="leading-relaxed">
                      <span className="text-white">A statement <span className="text-cyber-pink font-semibold">under penalty of perjury</span> that 
                      you have a good-faith belief the material was removed or disabled as a result of mistake or misidentification.</span>
                    </li>
                    <li className="leading-relaxed">
                      <span className="text-white">Your consent to the jurisdiction of the U.S. federal district court for 
                      your address (or Clark County, Nevada if outside the U.S.), and that you will accept service of 
                      process from the original claimant or their agent.</span>
                    </li>
                    <li className="leading-relaxed">
                      <span className="text-white">Your physical or electronic signature.</span>
                    </li>
                  </ol>
                </div>
                <div className="mt-4 bg-cyber-dark/80 border border-purple-500/20 rounded-lg p-4">
                  <p className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-purple-400" />
                    <span className="text-sm">Submit counter-notifications to:{" "}
                    <a href="mailto:dmca@cardify.club" className="text-cyber-cyan hover:text-cyber-pink transition-colors underline font-semibold">
                      dmca@cardify.club
                    </a>
                    </span>
                  </p>
                </div>
              </section>

              {/* Section 4 - What Happens Next */}
              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-cyber-cyan tracking-wider flex items-center gap-2">
                  <span className="text-cyber-pink">4.</span> What Happens Next (Timeline)
                </h2>
                <div className="space-y-4">
                  <div className="flex gap-4 items-start">
                    <Clock className="w-5 h-5 text-cyber-cyan mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-white mb-1">On valid notice:</p>
                      <p className="text-gray-300">Cardify disables or unpublishes the identified listing(s) and notifies the seller.</p>
                    </div>
                  </div>
                  <div className="flex gap-4 items-start">
                    <FileText className="w-5 h-5 text-purple-500 mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-white mb-1">On counter-notice:</p>
                      <p className="text-gray-300">Cardify forwards it to the original claimant.</p>
                    </div>
                  </div>
                  <div className="flex gap-4 items-start">
                    <Scale className="w-5 h-5 text-cyber-green mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-white mb-1">After 10–14 business days:</p>
                      <p className="text-gray-300">If Cardify does not receive notice that the claimant filed a court action, 
                      Cardify may restore the material. If court action is reported, the material remains disabled pending resolution.</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 5 - Repeat Infringer Policy */}
              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-cyber-cyan tracking-wider flex items-center gap-2">
                  <span className="text-cyber-pink">5.</span> Repeat-Infringer Policy
                </h2>
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <div className="flex gap-3 items-start">
                    <AlertTriangle className="w-5 h-5 text-red-400 mt-1 flex-shrink-0" />
                    <p className="leading-relaxed text-white">
                      Cardify may suspend or terminate accounts that receive multiple valid takedowns or otherwise 
                      repeatedly infringe copyrights. Strike counts and enforcement actions are recorded internally 
                      and applied consistently.
                    </p>
                  </div>
                </div>
              </section>

              {/* Contact Section */}
              <section className="border-t border-cyber-cyan/20 pt-8">
                <div className="bg-cyber-dark/80 border border-cyber-cyan/30 rounded-lg p-6 text-center">
                  <h3 className="text-lg font-bold text-white mb-3">DMCA Contact</h3>
                  <p className="text-gray-300 mb-4">For all DMCA-related matters, please contact:</p>
                  <a 
                    href="mailto:dmca@cardify.club" 
                    className="inline-flex items-center gap-2 text-cyber-cyan hover:text-cyber-pink transition-colors text-lg font-semibold"
                  >
                    <Mail className="w-5 h-5" />
                    dmca@cardify.club
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