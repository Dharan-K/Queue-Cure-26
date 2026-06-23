import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import LogoutButton from '../../../components/LogoutButton'
import useQueueCure from '../../../hooks/useQueueCure'
import { 
  Hash, 
  User, 
  ArrowLeft, 
  AlertCircle, 
  Trash2, 
  Play, 
  PlusCircle, 
  Clock as ClockIcon,
  Sparkles
} from 'lucide-react'

export default function ReceptionistQueue() {
  const { state, actions, getETAForIndex, rollingAvg } = useQueueCure()
  const { current, waitingList, meta, isLoading } = state
  const { addPatient, callNext, skipPatient, resetQueue, setAvgTime } = actions

  const [patientName, setPatientName] = useState('')
  const [isPriority, setIsPriority] = useState(false)
  const [avgTimeInput, setAvgTimeInput] = useState('5')
  const [isCallingNext, setIsCallingNext] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  // Format wait time
  const formatWaitTime = (ms) => {
    const mins = Math.round(ms / 60000)
    return `${mins} min${mins !== 1 ? 's' : ''}`
  }

  // Handle Add Patient
  const handleAddPatientSubmit = async (e) => {
    e.preventDefault()
    if (!patientName.trim()) {
      toast.error("Please enter a patient name")
      return
    }
    await addPatient(patientName, isPriority)
    setPatientName('')
    setIsPriority(false)
  }

  // Handle Call Next (with 300ms debounce)
  const handleCallNextClick = async () => {
    if (isCallingNext) return
    setIsCallingNext(true)
    
    if (waitingList.length === 0 && !current) {
      toast.info("Queue is empty")
      setIsCallingNext(false)
      return
    }
    
    await callNext()
    
    setTimeout(() => {
      setIsCallingNext(false)
    }, 300)
  }

  // Handle Average Time Update
  const handleAvgTimeChange = (e) => {
    setAvgTimeInput(e.target.value)
  }

  const handleSaveAvgTime = () => {
    const mins = parseFloat(avgTimeInput)
    if (isNaN(mins) || mins <= 0) {
      toast.error("Please enter a valid positive number")
      return
    }
    setAvgTime(mins)
  }

  const handleResetQueueClick = () => {
    if (showResetConfirm) {
      resetQueue()
      setShowResetConfirm(false)
    } else {
      setShowResetConfirm(true)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      {/* Header */}
      <header className="bg-white/5 backdrop-blur-xl border-b border-white/10 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Link 
              to="/receptionist"
              className="flex items-center space-x-2 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back to Dashboard</span>
            </Link>
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Hash className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Queue Cure Management</h1>
              <p className="text-sm text-slate-400">Real-time Patient Token & Queue Management</p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
              <p className="text-slate-400">Syncing with Realtime Database...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Top Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Card 1: Now Serving */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl flex items-center space-x-4">
                <div className="w-14 h-14 bg-amber-500/20 rounded-xl flex items-center justify-center text-amber-400">
                  <Play className="w-8 h-8" />
                </div>
                <div>
                  <div className="text-sm text-slate-400 font-medium uppercase tracking-wider">Now Serving</div>
                  <div className="text-3xl font-extrabold text-amber-400">
                    {current ? current.tokenNumber : "None"}
                  </div>
                  <div className="text-sm text-slate-300 mt-1 truncate max-w-[200px]">
                    {current ? current.patientName : "Waiting room empty"}
                  </div>
                </div>
              </div>

              {/* Card 2: In Queue */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl flex items-center space-x-4">
                <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
                  <User className="w-8 h-8" />
                </div>
                <div>
                  <div className="text-sm text-slate-400 font-medium uppercase tracking-wider">In Queue</div>
                  <div className="text-3xl font-extrabold text-blue-400">
                    {waitingList.length}
                  </div>
                  <div className="text-sm text-slate-300 mt-1">
                    Patients waiting to see doctor
                  </div>
                </div>
              </div>

              {/* Card 3: Avg Wait Time */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl flex items-center space-x-4">
                <div className="w-14 h-14 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
                  <ClockIcon className="w-8 h-8" />
                </div>
                <div>
                  <div className="text-sm text-slate-400 font-medium uppercase tracking-wider">Avg Wait Time</div>
                  <div className="text-3xl font-extrabold text-emerald-400">
                    {formatWaitTime(rollingAvg)}
                  </div>
                  <div className="text-sm text-slate-300 mt-1">
                    Based on rolling consults
                  </div>
                </div>
              </div>
            </div>

            {/* Split Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
              {/* Left Panel (40%) */}
              <div className="lg:col-span-4 space-y-6">
                {/* Add Patient Card */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-xl">
                  <h2 className="text-lg font-bold mb-4 flex items-center space-x-2">
                    <PlusCircle className="w-5 h-5 text-blue-400" />
                    <span>Add Patient to Queue</span>
                  </h2>

                  <form onSubmit={handleAddPatientSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-200 mb-2">
                        Patient Name
                      </label>
                      <input 
                        type="text" 
                        placeholder="Enter patient name"
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 outline-none focus:border-blue-400 transition-all"
                        required
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                      <div className="flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span className="text-sm font-medium">Emergency / Priority</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={isPriority}
                          onChange={(e) => setIsPriority(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                      </label>
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 transform hover:scale-[1.02]"
                    >
                      Add to Queue
                    </button>
                  </form>
                </div>

                {/* Queue Controls Card */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-xl space-y-4">
                  <h2 className="text-lg font-bold mb-2 flex items-center space-x-2">
                    <Hash className="w-5 h-5 text-blue-400" />
                    <span>Queue Controls</span>
                  </h2>

                  {/* Call Next Button */}
                  <button
                    onClick={handleCallNextClick}
                    disabled={isCallingNext || (waitingList.length === 0 && !current)}
                    className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:from-slate-700 disabled:to-slate-800 disabled:cursor-not-allowed text-white font-extrabold text-lg rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    {isCallingNext ? (
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Play className="w-5 h-5" />
                        <span>Call Next Token</span>
                      </>
                    )}
                  </button>

                  {/* Avg Consult Input */}
                  <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-3">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Avg. Consult Duration (Mins)
                    </label>
                    <div className="flex space-x-2">
                      <input 
                        type="number"
                        step="0.5"
                        min="0.5"
                        value={avgTimeInput}
                        onChange={handleAvgTimeChange}
                        className="w-20 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-center outline-none focus:border-blue-400 transition-all"
                      />
                      <button
                        type="button"
                        onClick={handleSaveAvgTime}
                        className="flex-1 py-2 px-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-400 font-semibold rounded-lg text-sm transition-all"
                      >
                        Update Wait Time
                      </button>
                    </div>
                  </div>

                  {/* Reset Queue Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleResetQueueClick}
                      className={`w-full py-3 font-semibold rounded-xl border transition-all text-sm flex items-center justify-center space-x-2 cursor-pointer ${
                        showResetConfirm 
                          ? 'bg-red-600 hover:bg-red-700 text-white border-red-500 shadow-lg shadow-red-500/20' 
                          : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20'
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>{showResetConfirm ? "Confirm Clear Queue?" : "Reset Queue"}</span>
                    </button>
                    {showResetConfirm && (
                      <button
                        type="button"
                        onClick={() => setShowResetConfirm(false)}
                        className="w-full text-center text-xs text-slate-400 mt-2 hover:underline cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Panel (60%) */}
              <div className="lg:col-span-6">
                <div className="bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl shadow-xl overflow-hidden h-full">
                  <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <h2 className="text-lg font-bold flex items-center space-x-2">
                      <User className="w-5 h-5 text-blue-400" />
                      <span>Live Waiting Queue</span>
                    </h2>
                    <span className="text-xs font-semibold px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full">
                      {waitingList.length} Waiting
                    </span>
                  </div>

                  {waitingList.length === 0 && !current ? (
                    <div className="p-12 text-center text-slate-400">
                      <AlertCircle className="w-12 h-12 text-slate-500 mx-auto mb-4 animate-bounce" />
                      <div className="text-lg font-semibold">Queue is Empty</div>
                      <p className="text-sm text-slate-500 mt-1">Add new patients using the form on the left.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-white/5 border-b border-white/10 text-left">
                          <tr>
                            <th className="px-6 py-4 text-sm font-medium text-slate-300">Token</th>
                            <th className="px-6 py-4 text-sm font-medium text-slate-300">Patient Name</th>
                            <th className="px-6 py-4 text-sm font-medium text-slate-300">Priority</th>
                            <th className="px-6 py-4 text-sm font-medium text-slate-300">Est. Wait</th>
                            <th className="px-6 py-4 text-sm font-medium text-slate-300">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                          {/* Currently serving row */}
                          {current && (
                            <tr className="bg-amber-500/10 border-l-4 border-l-amber-500 hover:bg-amber-500/20 transition-all font-semibold">
                              <td className="px-6 py-4">
                                <div className="w-11 h-11 bg-amber-500/30 rounded-lg flex items-center justify-center">
                                  <span className="text-lg font-bold text-amber-400">{current.tokenNumber}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-white">{current.patientName}</div>
                                <div className="text-xs text-amber-400 font-medium">Currently inside with doctor</div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs font-bold rounded-full">Serving</span>
                              </td>
                              <td className="px-6 py-4 text-amber-400">-</td>
                              <td className="px-6 py-4">
                                <button
                                  type="button"
                                  onClick={() => skipPatient('current')}
                                  className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                                >
                                  Skip
                                </button>
                              </td>
                            </tr>
                          )}

                          {/* Waiting list rows */}
                          {waitingList.map((patient, index) => (
                            <tr key={patient.id} className="hover:bg-white/5 transition-all">
                              <td className="px-6 py-4">
                                <div className="w-11 h-11 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                  <span className="text-lg font-bold text-blue-400">{patient.tokenNumber}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="font-medium text-white">{patient.patientName}</div>
                                <div className="text-xs text-slate-500 font-medium">Position #{index + 1}</div>
                              </td>
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
                              <td className="px-6 py-4">
                                <button
                                  type="button"
                                  onClick={() => skipPatient(patient.id)}
                                  className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                                >
                                  Skip
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
