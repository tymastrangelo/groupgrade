export default function PilotAgreement() {
  return (
    <div className="min-h-screen bg-background-light">
      <header className="flex items-center justify-between border-b border-[#dbdfe6] px-6 md:px-10 py-3 bg-white">
        <div className="flex items-center gap-3 text-[#111318]">
          <div className="size-6 text-primary">
            <span className="material-symbols-outlined">account_balance</span>
          </div>
          <h2 className="text-lg font-bold">GroupGrade</h2>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-xl shadow-sm border border-[#dbdfe6] p-8">
          <h1 className="text-3xl font-bold text-[#111318] mb-2">
            GroupGuide Pilot Participation Agreement & Confidentiality Waiver
          </h1>
          <p className="text-sm font-semibold text-[#616f89] mb-8">GroupGuide Group Collaboration Pilot</p>

          <div className="prose prose-sm max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-bold text-[#111318] mb-3">Purpose of the Pilot</h2>
              <p className="text-[#616f89] leading-relaxed">
                This pilot is designed to explore low-cost, low-friction methods to improve team productivity, 
                accountability, and collaboration in group projects. Participation is intended to enhance students' 
                learning experience and group effectiveness.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111318] mb-3">Voluntary Participation</h2>
              <p className="text-[#616f89] leading-relaxed">
                Participation in this pilot is voluntary. Students may choose not to participate at any time without 
                academic penalty.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111318] mb-3">Confidentiality Agreement</h2>
              <p className="text-[#616f89] leading-relaxed mb-3">By participating in this pilot, you agree to:</p>
              <ol className="list-decimal list-inside text-[#616f89] space-y-2 ml-4">
                <li>
                  Maintain confidentiality of all materials, processes, frameworks, software features, and documentation 
                  shared as part of this pilot.
                </li>
                <li>
                  Not share, distribute, reproduce, record, or disclose any materials outside of this class without 
                  prior written permission.
                </li>
                <li>
                  Not copy, replicate, adapt, or use the tool, framework, or related materials for personal, commercial, 
                  or external academic purposes.
                </li>
              </ol>
              <p className="text-[#616f89] leading-relaxed mt-4">
                All pilot materials, concepts, processes, branding elements, and related intellectual property are 
                proprietary and protected under applicable copyright, trademark, and intellectual property laws.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111318] mb-3">Intellectual Property Notice</h2>
              <p className="text-[#616f89] leading-relaxed mb-3">
                All materials provided in connection with this pilot, including but not limited to:
              </p>
              <ul className="list-disc list-inside text-[#616f89] space-y-2 ml-4">
                <li>Software features</li>
                <li>Frameworks and systems</li>
                <li>Branding and naming</li>
                <li>Written materials and documentation</li>
                <li>Designs and workflows</li>
              </ul>
              <p className="text-[#616f89] leading-relaxed mt-3">
                are the intellectual property of the creator and are protected by copyright and trademark law. 
                Unauthorized use, reproduction, or distribution is prohibited.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111318] mb-3">Release of Liability</h2>
              <p className="text-[#616f89] leading-relaxed mb-3">
                By participating in this pilot, you acknowledge and agree that:
              </p>
              <ul className="list-disc list-inside text-[#616f89] space-y-2 ml-4">
                <li>The tool is intended solely to support group productivity and collaboration.</li>
                <li>Participation presents no known academic, physical, financial, or personal risk.</li>
                <li>
                  The creator, instructors, and affiliated parties are not liable for any indirect or perceived 
                  academic outcomes related to group performance.
                </li>
                <li>
                  Participation is designed to support and improve the student experience and cannot negatively 
                  impact academic standing.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#111318] mb-3">Acknowledgment</h2>
              <p className="text-[#616f89] leading-relaxed mb-3">By accepting this agreement, you confirm that:</p>
              <ul className="list-disc list-inside text-[#616f89] space-y-2 ml-4">
                <li>You understand the purpose of this pilot.</li>
                <li>You agree to maintain confidentiality.</li>
                <li>You acknowledge the intellectual property protections.</li>
                <li>You voluntarily agree to participate.</li>
              </ul>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-[#e5e7eb]">
            <a
              href="/role"
              className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              Back to Sign Up
            </a>
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-[#616f89] text-xs">
        © 2026 GroupGrade Accountability Platform. All rights reserved.
      </footer>
    </div>
  );
}
