import { useState } from 'react'
import { Link } from 'react-router-dom'
import LogoutButton from '../../../components/LogoutButton'
import useQueueCure from '../../../hooks/useQueueCure'
import { 
  Hash, 
  User, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle, 
  Clock as ClockIcon,
  Sparkles,
  ArrowRight
} from 'lucide-react'

export default function DoctorQueue() {
  const { state, actions, getETAForIndex } = useQueueCure()
  const { current, waitingList, isLoading } = state
  const { callNext } = actions
  const [isFinishing, setIsFinishing] = useState(false)

  // Format wait time
  const formatWaitTime = (ms) => {
    const mins = Math.round(ms / 60000)
    return `${mins} min${mins !== 1 ? 's' : ''}`
  }

  // Handle Mark Done (triggers callNext)
  const handleMarkDoneClick = async () => {
    setIsFinishing(true)
    await callNext()
    setIsFinishing(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      {/* Header */}
      <header className="bg-white/5 backdrop-blur-xl border-b border-white/10 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Link 
              to="/doctor"
              className="flex items-center space-x-2 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back to Dashboard</span>
            </Link>
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Hash className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Doctor Patient Queue</h1>
              <p className="text-sm text-slate-400">View and progress patients through consultation</p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
              <p className="text-slate-400">Syncing with Realtime Database...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Currently Serving Box (Large & Prominent) */}
            <div className="bg-gradient-to-r from-emerald-500/20 to-blue-500/20 border border-emerald-400/30 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
              {/* Decorative accent orb */}
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl"></div>
              
              <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="flex items-center space-x-5">
                  <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <span className="text-5xl font-extrabold">{current ? current.tokenNumber : "-"}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400">
                      Currently Serving
                    </span>
                    <h2 className="text-3xl font-extrabold text-white tracking-tight">
                      {current ? current.patientName : "No Active Patient"}
                    </h2>
                    <p className="text-slate-400 text-sm">
                      {current ? `Called at ${new Date(current.calledAt).toLocaleTimeString()}` : "Ready to take the next patient"}
                    </p>
                  </div>
                </div>

                {current && (
                  <button
                    type="button"
                    onClick={handleMarkDoneClick}
                    disabled={isFinishing}
                    className="py-4 px-8 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 font-extrabold text-slate-900 text-base rounded-xl transition-all shadow-xl shadow-emerald-500/20 transform hover:scale-[1.02] flex items-center justify-center space-x-2 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isFinishing ? (
                      <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5 text-slate-900" />
                        <span>Mark Consultation Done</span>
                      </>
                    )}
                  </button>
                )}

                {!current && waitingList.length > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkDoneClick}
                    disabled={isFinishing}
                    className="py-4 px-8 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 font-extrabold text-slate-900 text-base rounded-xl transition-all shadow-xl shadow-blue-500/20 transform hover:scale-[1.02] flex items-center justify-center space-x-2 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ArrowRight className="w-5 h-5 text-slate-900" />
                    <span>Call Next Patient</span>
                  </button>
                )}
              </div>
            </div>

            {/* Waiting Queue List Card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl shadow-xl overflow-hidden">
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                <h3 className="text-lg font-bold flex items-center space-x-2">
                  <User className="w-5 h-5 text-blue-400" />
                  <span>Up Next in Line</span>
                </h3>
                {waitingList.length > 0 && (
                  <div className="flex items-center space-x-2 text-sm text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                    <ClockIcon className="w-4 h-4" />
                    <span>Next Wait: {formatWaitTime(getETAForIndex(0))}</span>
                  </div>
                )}
              </div>

              {waitingList.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <AlertCircle className="w-12 h-12 text-slate-500 mx-auto mb-4 animate-bounce" />
                  <div className="text-lg font-semibold">No Patients Waiting</div>
                  <p className="text-sm text-slate-500 mt-1">Receptionist has not added any patients to the queue.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-white/5 border-b border-white/10 text-left">
                      <tr>
                        <th className="px-6 py-4 text-sm font-medium text-slate-300">Position</th>
                        <th className="px-6 py-4 text-sm font-medium text-slate-300">Token</th>
                        <th className="px-6 py-4 text-sm font-medium text-slate-300">Patient Name</th>
                        <th className="px-6 py-4 text-sm font-medium text-slate-300">Priority</th>
                        <th className="px-6 py-4 text-sm font-medium text-slate-300">Est. Consult Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {waitingList.map((patient, index) => (
                        <tr key={patient.id} className="hover:bg-white/5 transition-all">
                          <td className="px-6 py-4 text-slate-400 font-medium">#{index + 1}</td>
                          <td className="px-6 py-4">
                            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center font-bold text-blue-400">
                              {patient.tokenNumber}
                            </div>
                          </td>
                          <td className="px-6 py-4 font-semibold text-white">{patient.patientName}</td>
                          <td className="px-6 py-4">
                            {patient.isPriority ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400">
                                <Sparkles className="w-3 h-3 mr-1" />
                                Priority
                              </span>
                            ) : (
                              <span className="text-slate-500 text-xs">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-emerald-400 font-semibold">
                            {formatWaitTime(getETAForIndex(index))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
