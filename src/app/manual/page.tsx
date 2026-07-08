/**
 * /manual — Public user guide
 *
 * Accessible without authentication so users can read it before signing in,
 * and share it with new team members who don't have access yet.
 */
import Link from 'next/link'
import { BarChart2, ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'User Manual — Vantage',
  description: 'Complete guide to using the Vantage performance intelligence dashboard.',
}

interface Section {
  id:    string
  title: string
  icon:  string
  items: { heading: string; body: string }[]
}

const SECTIONS: Section[] = [
  {
    id: 'getting-started', title: 'Getting Started', icon: '🚀',
    items: [
      {
        heading: 'Signing In',
        body: 'You can sign in two ways. Click "Continue with Google" to use your Google account — this is the recommended method. Alternatively, enter your name and the shared access password provided by your administrator. Your name is used to identify your entries in the audit trail, so use your real name.',
      },
      {
        heading: 'Your Role',
        body: 'Every user has one of three roles. Admins have full access including settings and user management. DataEntry users can add and import records and view all reports. Viewers can only view the dashboard and download reports — they cannot add or change any data. Your role is shown in the sidebar next to your name and in the top bar.',
      },
      {
        heading: 'First-Time Setup',
        body: 'If you are the administrator setting up Vantage for the first time, go to Settings → Identity to set your organisation name and upload your logo. Then go to Settings → Reports to set your base currency. Finally, go to Settings → App Config to rename the field labels to match your organisation (e.g. "Service" instead of "Product").',
      },
    ],
  },
  {
    id: 'dashboard', title: 'Dashboard', icon: '📊',
    items: [
      {
        heading: 'KPI Cards',
        body: 'Five summary numbers sit across the top of the dashboard. Target Amount is the total of all targets for the selected period. Actual Amount is what was achieved. Targets Met shows how many individual records met or exceeded their target out of the total. Variance is the difference between Actual and Target — green means above target, red means below. Achievement % is Actual divided by Target times 100.',
      },
      {
        heading: 'Filters',
        body: 'Seven dropdowns at the top let you narrow the dashboard to any combination of Year, Month, Region, Product/Service, Sales Rep, Status, and Performance Flag. Every chart and KPI card updates instantly when you change a filter. The currency selector (far right) lets you convert all values to any of 40 currencies using live exchange rates — no setup needed.',
      },
      {
        heading: 'Charts',
        body: 'The gauge shows overall Target Met % for the selected period. The variance bar chart shows which products or services are above or below target — green bars are above, red bars are below. The horizontal bar chart ranks regions by how many of their records met target. The grouped bar chart compares Actual vs Target side by side for each region.',
      },
      {
        heading: 'Drill-Through',
        body: 'Every bar in every chart is clickable. Clicking a bar takes you directly to the analysis page for that item, pre-filtered to show only that region or product. This is the same as Power BI\'s drill-through feature. A blue banner at the top of the analysis page shows what you drilled from, and a Back button returns you to the dashboard with your filters intact.',
      },
      {
        heading: 'Performance Flags',
        body: 'Every record is automatically classified into one of four flags based on its achievement percentage. 🟢 Exceeding means at or above 100%. 🔵 On Track means 90%–99%. 🟡 At Risk means 75%–89%. 🔴 Below Target means below 75%. These thresholds can be adjusted by an Admin in Settings → App Config.',
      },
      {
        heading: 'Currency Conversion',
        body: 'The currency selector dropdown at the right of the filter bar lists 40 currencies across all regions. Select any currency and all monetary values on the dashboard convert automatically using live daily exchange rates — no API key or setup required. A blue notice bar confirms the conversion and shows when rates were last updated. The selection is saved in the URL so you can share a converted view with a colleague.',
      },
    ],
  },
  {
    id: 'data-entry', title: 'Entering Data', icon: '✏️',
    items: [
      {
        heading: 'Manual Entry Form',
        body: 'Go to Data Entry in the sidebar. Fill in the Date, Region, Product/Service, and Sales Rep from the dropdowns, then enter the Target Amount and Actual Amount. As you type the amounts, a live preview above the form shows the Variance, Achievement %, and Performance Flag — so you can verify before saving. Click Save Record. The record is saved to Google Sheets and the dashboard updates immediately.',
      },
      {
        heading: 'Required Fields',
        body: 'Date, Region, Product/Service, Sales Rep, Target Amount, and Actual Amount are always required. Notes may be required depending on your organisation\'s settings. Status defaults to Active.',
      },
      {
        heading: 'Who Recorded This',
        body: 'Every record is automatically stamped with the name and email of the person who entered it, plus the exact date and time. This creates a complete audit trail. You cannot change or remove the recorded-by information after saving.',
      },
    ],
  },
  {
    id: 'importing', title: 'Importing from Excel', icon: '📥',
    items: [
      {
        heading: 'Supported Formats',
        body: 'Vantage accepts Excel files (.xlsx, .xls) and CSV files (.csv). You do not need to reformat your existing spreadsheet — the importer recognises common column name variations automatically.',
      },
      {
        heading: 'Column Names',
        body: 'The importer matches column names case-insensitively and ignores spaces, underscores, and hyphens. For the date column, use "date". For region, any of: region, branch, territory, zone. For product/service: category, product, service, department, item. For sales rep: salesRep, rep, officer, agent, name. For amounts: targetAmount, target, goal / actualAmount, actual, sales, achieved. Status and Notes are optional.',
      },
      {
        heading: 'Downloading a Template',
        body: 'Click the Template button (top right of the Import page) to download a sample CSV file with the correct column names and an example row. Fill this in with your data and import it back.',
      },
      {
        heading: 'Import Results',
        body: 'After importing, a summary shows how many records were successfully imported and how many rows failed. Failed rows are listed with the specific reason so you can fix them and re-import. You only need to include the failed rows in the second import.',
      },
    ],
  },
  {
    id: 'analysis', title: 'Analysis Pages', icon: '🔍',
    items: [
      {
        heading: 'Region Analysis',
        body: 'Shows a bar chart of Actual vs Target for every region, followed by a table ranked by achievement percentage. Includes Variance, Achievement %, record count, and Performance Flag per region. You can arrive here directly by clicking any region bar on the main dashboard.',
      },
      {
        heading: 'Product / Service Analysis',
        body: 'Shows variance percentage per category as a colour-coded bar chart (green for above target, red for below), followed by a detail table. The label shown depends on your organisation\'s settings — it may say Product, Service, Department, or something else.',
      },
      {
        heading: 'Sales Rep Analysis',
        body: 'A ranked leaderboard of all sales reps by achievement percentage. Also shows Hit Rate — the percentage of their individual records that met or exceeded target — alongside their total Target, Actual, and Performance Flag.',
      },
      {
        heading: 'Monthly Trends',
        body: 'A combined bar and line chart showing Actual vs Target for every month in your data, with an Achievement % trend line overlaid. The table below shows the same data in numbers. Use the Year filter on the dashboard before navigating here to focus on a specific year.',
      },
    ],
  },
  {
    id: 'reports', title: 'Reports & PDF', icon: '📄',
    items: [
      {
        heading: 'Generating a Report',
        body: 'Go to Reports & PDF in the sidebar. Use the Year, Month, and Region dropdowns to scope the report. The KPI summary and full records table update as you change the filters. When you are satisfied, click Print / Save PDF.',
      },
      {
        heading: 'Saving as PDF',
        body: 'The Print / Save PDF button opens your browser\'s print dialog. Change the Destination to "Save as PDF". Set Layout to Landscape for better table readability. Click Save. The PDF includes your organisation\'s name, logo, contact details, and footer text as configured in Settings.',
      },
      {
        heading: 'What Appears in the PDF',
        body: 'The PDF header shows your organisation name and legal name, the report title prefix and period, the date generated, and the Prepared By name. The body contains the five KPI cards and a full records table. The footer contains your contact email, phone number, address, and confidentiality text. The logo appears if one has been uploaded in Settings → Identity.',
      },
    ],
  },
  {
    id: 'settings', title: 'Settings (Admins)', icon: '⚙️',
    items: [
      {
        heading: 'Identity Tab',
        body: 'Set your organisation name, legal name, tagline, and website. Upload a logo for light backgrounds (shown in the sidebar and PDF header), a logo for dark backgrounds, and a favicon (browser tab icon). Logos should be PNG, SVG, or WEBP and under 2MB. Changes take effect immediately across the entire app and all future PDF reports.',
      },
      {
        heading: 'Contact Tab',
        body: 'Enter your primary email, support email, phone number, and physical address. These appear in the footer of every PDF report. Social links are optional.',
      },
      {
        heading: 'Branding Tab',
        body: 'Choose your brand colours using the colour picker or by typing a hex code. The Live Preview panel shows the effect on a miniature version of the app before you save. Choose your preferred font from five options and set the default colour mode (light, dark, or system).',
      },
      {
        heading: 'Reports Tab',
        body: 'Set your base currency — this is the currency all data is entered in. Users can convert to other currencies on the dashboard, but the base currency is what is stored. Also set the number format, date format, fiscal year start, PDF title prefix, prepared-by name, footer text, and watermark options.',
      },
      {
        heading: 'App Config Tab',
        body: 'Rename the field labels to match your organisation. Change "Product" to "Service", "Region" to "Branch", "Sales Rep" to "Officer" — the entire app, including forms, filters, charts, and PDFs, updates immediately. Also set performance flag thresholds, the default dashboard period, and whether data editing is allowed after submission.',
      },
      {
        heading: 'Managing Users',
        body: 'Scroll to Authorised Users at the bottom of App Config. Click Add User, enter their Google email address, choose their role (Viewer, DataEntry, or Admin), and click Add. That person can now sign in with "Continue with Google". If you need to revoke access, contact your system administrator to remove them from the list.',
      },
    ],
  },
  {
    id: 'faq', title: 'FAQ', icon: '❓',
    items: [
      {
        heading: 'Where is my data stored?',
        body: 'All data is stored in a Google Sheet connected to your Vantage installation. Your administrator can share the spreadsheet with you directly so you can view the raw data in Google Sheets at any time.',
      },
      {
        heading: 'Can two people enter data at the same time?',
        body: 'Yes. Records are independent rows in the spreadsheet. There is no locking or conflict between simultaneous entries.',
      },
      {
        heading: 'Can I edit a record after saving it?',
        body: 'Only if an Admin has enabled "Allow Data Editing" in Settings → App Config. By default, records cannot be edited after submission to preserve data integrity.',
      },
      {
        heading: 'The dashboard shows old data after I added a record.',
        body: 'Refresh the page. The dashboard reads live data from Google Sheets on every full page load. If data is visible in the spreadsheet, it will appear on the next refresh.',
      },
      {
        heading: 'The currency conversion shows stale rates.',
        body: 'Exchange rates are cached for one hour on the server. If you need the very latest rate, wait an hour or contact your administrator to restart the server which clears the cache.',
      },
      {
        heading: 'I see Access Denied when signing in with Google.',
        body: 'Your Google email has not been added to the Authorised Users list. Contact your administrator and ask them to add your email in Settings → App Config → Authorised Users.',
      },
      {
        heading: 'Logo upload fails.',
        body: 'Logo upload requires Cloudinary to be configured by your administrator. If it has not been set up yet, all other features work normally — only logo upload is affected.',
      },
    ],
  },
]

export default function ManualPage() {
  return (
    <div className="min-h-screen" style={{ background: '#f0f7ff' }}>

      {/* Top nav */}
      <nav className="sticky top-0 z-10 border-b shadow-sm"
        style={{ background: '#ffffff', borderColor: '#bfdbfe' }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: '#0c3460' }}>
              <BarChart2 size={16} color="#7dd3fc" />
            </div>
            <div>
              <span className="font-bold text-sm" style={{ color: '#0c1a2e' }}>Vantage</span>
              <span className="text-sm ml-2" style={{ color: '#4b6a8f' }}>User Manual</span>
            </div>
          </div>
          <Link href="/login"
            className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
            style={{ background: '#0284c7', color: 'white' }}>
            Sign In →
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-extrabold mb-2" style={{ color: '#0c1a2e' }}>
            User Manual
          </h1>
          <p className="text-base" style={{ color: '#4b6a8f' }}>
            Complete guide to using Vantage — Performance Intelligence.
          </p>
        </div>

        {/* Quick nav */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          {SECTIONS.map(s => (
            <a key={s.id} href={`#${s.id}`}
              className="flex items-center gap-2 p-3 rounded-xl border text-sm font-medium
                         transition-all hover:shadow-md hover:border-blue-300"
              style={{ background: '#ffffff', borderColor: '#bfdbfe', color: '#0c1a2e' }}>
              <span className="text-base">{s.icon}</span>
              {s.title}
            </a>
          ))}
        </div>

        {/* Sections */}
        <div className="space-y-12">
          {SECTIONS.map(section => (
            <div key={section.id} id={section.id}>
              <div className="flex items-center gap-3 mb-5">
                <span className="text-2xl">{section.icon}</span>
                <h2 className="text-xl font-bold" style={{ color: '#0c1a2e' }}>
                  {section.title}
                </h2>
                <div className="flex-1 h-px" style={{ background: '#bfdbfe' }} />
              </div>

              <div className="space-y-4">
                {section.items.map((item, i) => (
                  <div key={i} className="rounded-xl border p-5"
                    style={{ background: '#ffffff', borderColor: '#bfdbfe' }}>
                    <h3 className="text-sm font-bold mb-2" style={{ color: '#0c1a2e' }}>
                      {item.heading}
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: '#4b6a8f' }}>
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="mt-14 rounded-2xl p-8 text-center"
          style={{ background: '#0c3460' }}>
          <h3 className="text-xl font-bold text-white mb-2">Ready to get started?</h3>
          <p className="text-sm mb-5" style={{ color: '#93c5fd' }}>
            Sign in to your Vantage dashboard and start tracking performance.
          </p>
          <Link href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold
                       transition-opacity hover:opacity-80"
            style={{ background: '#0284c7', color: 'white' }}>
            Sign In to Vantage →
          </Link>
        </div>

        <p className="text-center text-xs mt-8" style={{ color: '#93c5fd99' }}>
          Vantage · Performance Intelligence
        </p>
      </div>
    </div>
  )
}
