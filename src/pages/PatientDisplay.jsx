import useQueueCure from '../hooks/useQueueCure'
import { Hash, Clock, AlertCircle } from 'lucide-react'

export default function PatientDisplay() {
  const { state, getETAForIndex } = useQueueCure()
  const { current, waitingList, isLoading } = state

  // Format wait time
  const formatWaitTime = (ms) => {
    const mins = Math.round(ms / 60000)
    return `${mins} min${mins !== 1 ? 's' : ''}`
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-8 font-sans relative overflow-hidden select-none">
      {/* Premium background styling */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:60px_60px]"></div>
      </div>

      {/* Top Header */}
      <header className="relative z-10 flex justify-between items-center border-b border-white/5 pb-6">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400">
            <Hash className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              Queue Cure Patient Display
            </h1>
            <p className="text-slate-400 text-sm">Please observe your token number</p>
          </div>
        </div>

        {/* Live Status indicator */}
        <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/25 px-4 py-2 rounded-full shadow-lg shadow-emerald-500/5">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-bold text-emerald-400 tracking-widest uppercase">Live Queue</span>
        </div>
      </header>

      {/* Main Grid */}
      <main className="relative z-10 my-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch py-8">
        {/* Left Column: Now Serving (7/12 width) */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl h-full min-h-[350px]">
              <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-emerald-400 mb-4"></div>
              <p className="text-slate-400 text-lg">Syncing live dashboard...</p>
            </div>
          ) : current ? (
            <div className="bg-gradient-to-br from-emerald-950/40 to-slate-900/60 border border-emerald-500/30 rounded-3xl p-10 backdrop-blur-xl shadow-2xl flex flex-col items-center justify-center text-center h-full relative overflow-hidden">
              <div className="absolute w-60 h-60 bg-emerald-400/5 rounded-full blur-3xl"></div>
              
              <div className="text-emerald-400 font-extrabold text-sm uppercase tracking-widest mb-4">
                Now Serving
              </div>

              {/* Giant Token */}
              <div className="text-[120px] font-black leading-none bg-gradient-to-b from-emerald-300 via-emerald-400 to-teal-400 bg-clip-text text-transparent drop-shadow-[0_10px_20px_rgba(16,185,129,0.2)] select-none">
                {current.tokenNumber}
              </div>

              <div className="text-4xl font-extrabold text-white mt-6 tracking-tight">
                {current.patientName}
              </div>

              <div className="mt-6 flex items-center space-x-2 text-slate-400 text-lg">
                <Clock className="w-5 h-5 text-emerald-400" />
                <span>Consultation started at {new Date(current.calledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-12 backdrop-blur-xl flex flex-col items-center justify-center text-center h-full min-h-[350px]">
              <AlertCircle className="w-16 h-16 text-slate-500 mb-4 animate-pulse" />
              <h2 className="text-2xl font-bold text-slate-300 mb-2">No Token Active</h2>
              <p className="text-slate-500 max-w-sm">The doctor is not currently consulting. Please wait for the next token to be called.</p>
            </div>
          )}
        </div>

        {/* Right Column: Next Up (5/12 width) */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl flex flex-col h-full justify-between min-h-[350px]">
            <div>
              <h2 className="text-xl font-bold text-slate-200 border-b border-white/5 pb-4 mb-4">
                Up Next / Waiting List
              </h2>
              
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(n => (
                    <div key={n} className="h-16 bg-white/5 rounded-2xl animate-pulse"></div>
                  ))}
                </div>
              ) : waitingList.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <p className="text-lg font-medium">All caught up!</p>
                  <p className="text-sm mt-1">No additional tokens are waiting.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {waitingList.slice(0, 4).map((patient, index) => (
                    <div 
                      key={patient.id} 
                      className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:border-emerald-500/20 transition-all"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center font-bold text-emerald-400 text-lg">
                          {patient.tokenNumber}
                        </div>
                        <div>
                          <div className="font-bold text-white text-base">{patient.patientName}</div>
                          <div className="text-xs text-slate-500 font-medium">Position #{index + 1}</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-slate-400 font-bold">Est. Wait</div>
                        <div className="text-sm font-extrabold text-emerald-400">
                          {formatWaitTime(getETAForIndex(index))}
                        </div>
                      </div>
                    </div>
                  ))}
                  {waitingList.length > 4 && (
                    <div className="text-center text-xs text-slate-500 pt-2 font-medium">
                      + {waitingList.length - 4} more patient{waitingList.length - 4 !== 1 ? 's' : ''} in queue
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Overall Estimated wait indicator */}
            {waitingList.length > 0 && (
              <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between bg-emerald-500/5 -mx-8 -mb-8 p-8 rounded-b-3xl">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-emerald-500/15 rounded-lg flex items-center justify-center text-emerald-400">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Next Est. Wait</div>
                    <div className="text-sm text-slate-300 font-medium">Average time per patient</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-emerald-400">
                    {formatWaitTime(getETAForIndex(0))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Bottom Footer Info */}
      <footer className="relative z-10 border-t border-white/5 pt-6 flex justify-between items-center text-xs text-slate-500 font-semibold tracking-wider uppercase">
        <div>Please contact receptionist for generating tokens</div>
        <div>{new Date().toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</div>
      </footer>
    </div>
  )
}
