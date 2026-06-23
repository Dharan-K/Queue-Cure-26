import { useState, useEffect } from 'react'
import { ref, onValue, set, runTransaction, remove } from 'firebase/database'
import { rtdb } from '../firebase/config'
import toast from 'react-hot-toast'

export default function useQueueCure() {
  const [queueState, setQueueState] = useState({
    current: null,
    waiting: {},
    meta: {
      avgConsultTimeMs: 300000,
      consultHistory: [],
      totalServedToday: 0,
      lastTokenNumber: 0,
      lastReset: Date.now()
    }
  })
  const [isLoading, setIsLoading] = useState(true)
  const [now, setNow] = useState(Date.now())
  const [useLocalFallback, setUseLocalFallback] = useState(false)

  // Fetch local fallback data from localStorage
  const getLocalQueue = () => {
    try {
      const local = localStorage.getItem('queue_cure_local')
      if (local) {
        return JSON.parse(local)
      }
    } catch (e) {
      console.error("Error reading localStorage", e)
    }
    return {
      current: null,
      waiting: {},
      meta: {
        avgConsultTimeMs: 300000,
        consultHistory: [],
        totalServedToday: 0,
        lastTokenNumber: 0,
        lastReset: Date.now()
      }
    }
  }

  // Save local fallback data
  const saveLocalQueue = (data) => {
    try {
      localStorage.setItem('queue_cure_local', JSON.stringify(data))
      setQueueState(data)
    } catch (e) {
      console.error("Error saving localStorage", e)
    }
  }

  // Sync with Firebase RTDB
  useEffect(() => {
    let active = true
    let unsubscribe = () => {}
    
    // Timeout to fallback if RTDB is taking too long (e.g. wrong URL, not initialized)
    const timeout = setTimeout(() => {
      if (isLoading && active) {
        console.warn("RTDB sync timed out. Falling back to local storage queue.")
        setUseLocalFallback(true)
        setQueueState(getLocalQueue())
        setIsLoading(false)
        toast.error("Firebase Database unreachable. Running in Local Fallback mode.", { id: 'rtdb-timeout' })
      }
    }, 2000)

    try {
      const queueRef = ref(rtdb, 'queue')
      unsubscribe = onValue(queueRef, (snapshot) => {
        clearTimeout(timeout)
        if (!active) return
        
        if (snapshot.exists()) {
          const val = snapshot.val()
          setQueueState({
            current: val.current || null,
            waiting: val.waiting || {},
            meta: {
              avgConsultTimeMs: val.meta?.avgConsultTimeMs ?? 300000,
              consultHistory: val.meta?.consultHistory || [],
              totalServedToday: val.meta?.totalServedToday ?? 0,
              lastTokenNumber: val.meta?.lastTokenNumber ?? 0,
              lastReset: val.meta?.lastReset ?? Date.now()
            }
          })
          setUseLocalFallback(false)
        } else {
          // Queue is uninitialized, set default metadata
          setQueueState({
            current: null,
            waiting: {},
            meta: {
              avgConsultTimeMs: 300000,
              consultHistory: [],
              totalServedToday: 0,
              lastTokenNumber: 0,
              lastReset: Date.now()
            }
          })
          setUseLocalFallback(false)
        }
        setIsLoading(false)
      }, (error) => {
        clearTimeout(timeout)
        console.error("RTDB Queue subscribe error:", error)
        if (active) {
          setUseLocalFallback(true)
          setQueueState(getLocalQueue())
          setIsLoading(false)
        }
      })
    } catch (error) {
      clearTimeout(timeout)
      console.error("Error setting up RTDB connection:", error)
      if (active) {
        setUseLocalFallback(true)
        setQueueState(getLocalQueue())
        setIsLoading(false)
      }
    }

    return () => {
      active = false
      clearTimeout(timeout)
      unsubscribe()
    }
  }, [])

  // Update clock every second for reactive ETA
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const { current, waiting, meta } = queueState

  // Calculate rolling average
  const rollingAvg = meta.consultHistory && meta.consultHistory.length > 0
    ? meta.consultHistory.reduce((a, b) => a + b, 0) / meta.consultHistory.length
    : meta.avgConsultTimeMs

  // Calculate elapsed time for currently serving patient
  const elapsedForCurrent = current?.calledAt
    ? now - current.calledAt
    : 0

  // Calculate remaining time for currently serving patient
  const remainingCurrent = Math.max(0, rollingAvg - elapsedForCurrent)

  // Compute wait list array sorted by position
  const waitingList = Object.entries(waiting || {})
    .map(([key, val]) => ({ id: key, ...val }))
    .sort((a, b) => (a.position || 0) - (b.position || 0))

  // Function to compute ETA (in milliseconds from now) for a given 0-indexed position in waitlist
  const getETAForIndex = (index) => {
    return remainingCurrent + (index * rollingAvg)
  }

  // Dequeue logic (atomic or local fallback)
  const callNext = async () => {
    if (useLocalFallback) {
      const currentQueue = getLocalQueue()
      const waitingMap = currentQueue.waiting || {}
      const waitingListLocal = Object.entries(waitingMap).map(([key, val]) => ({
        key,
        ...val
      }))

      const previousCurrent = currentQueue.current

      if (waitingListLocal.length === 0) {
        if (previousCurrent) {
          if (previousCurrent.calledAt) {
            const duration = Date.now() - previousCurrent.calledAt
            if (!currentQueue.meta.consultHistory) currentQueue.meta.consultHistory = []
            currentQueue.meta.consultHistory.push(duration)
            if (currentQueue.meta.consultHistory.length > 10) currentQueue.meta.consultHistory.shift()
          }
          currentQueue.current = null
        }
        saveLocalQueue(currentQueue)
        return
      }

      waitingListLocal.sort((a, b) => (a.position || 0) - (b.position || 0))
      const nextPatient = waitingListLocal[0]
      delete waitingMap[nextPatient.key]

      currentQueue.current = {
        tokenNumber: nextPatient.tokenNumber,
        patientName: nextPatient.patientName,
        calledAt: Date.now()
      }

      if (previousCurrent && previousCurrent.calledAt) {
        const duration = Date.now() - previousCurrent.calledAt
        if (!currentQueue.meta.consultHistory) currentQueue.meta.consultHistory = []
        currentQueue.meta.consultHistory.push(duration)
        if (currentQueue.meta.consultHistory.length > 10) currentQueue.meta.consultHistory.shift()
      }

      currentQueue.meta.totalServedToday = (currentQueue.meta.totalServedToday || 0) + 1
      currentQueue.waiting = waitingMap
      saveLocalQueue(currentQueue)
      toast.success("Called next patient (Local Mode)!")
      return
    }

    const queueRef = ref(rtdb, 'queue')
    try {
      const result = await runTransaction(queueRef, (currentQueue) => {
        if (!currentQueue) {
          currentQueue = {
            current: null,
            waiting: {},
            meta: {
              avgConsultTimeMs: 300000,
              consultHistory: [],
              totalServedToday: 0,
              lastTokenNumber: 0,
              lastReset: Date.now()
            }
          }
        }

        const waitingMap = currentQueue.waiting || {}
        const waitingListLocal = Object.entries(waitingMap).map(([key, val]) => ({
          key,
          ...val
        }))

        const previousCurrent = currentQueue.current

        if (waitingListLocal.length === 0) {
          if (previousCurrent) {
            if (previousCurrent.calledAt) {
              const duration = Date.now() - previousCurrent.calledAt
              if (!currentQueue.meta) currentQueue.meta = {}
              if (!currentQueue.meta.consultHistory) currentQueue.meta.consultHistory = []
              currentQueue.meta.consultHistory.push(duration)
              if (currentQueue.meta.consultHistory.length > 10) {
                currentQueue.meta.consultHistory.shift()
              }
            }
            currentQueue.current = null
          }
          return currentQueue
        }

        waitingListLocal.sort((a, b) => (a.position || 0) - (b.position || 0))
        const nextPatient = waitingListLocal[0]
        delete waitingMap[nextPatient.key]

        currentQueue.current = {
          tokenNumber: nextPatient.tokenNumber,
          patientName: nextPatient.patientName,
          calledAt: Date.now()
        }

        if (!currentQueue.meta) {
          currentQueue.meta = {
            avgConsultTimeMs: 300000,
            consultHistory: [],
            totalServedToday: 0,
            lastTokenNumber: 0,
            lastReset: Date.now()
          }
        }

        if (previousCurrent && previousCurrent.calledAt) {
          const duration = Date.now() - previousCurrent.calledAt
          if (!currentQueue.meta.consultHistory) currentQueue.meta.consultHistory = []
          currentQueue.meta.consultHistory.push(duration)
          if (currentQueue.meta.consultHistory.length > 10) {
            currentQueue.meta.consultHistory.shift()
          }
        }

        currentQueue.meta.totalServedToday = (currentQueue.meta.totalServedToday || 0) + 1
        currentQueue.waiting = waitingMap

        return currentQueue
      })

      if (result.committed) {
        toast.success("Called next patient successfully!")
      } else {
        toast.error("Could not call next patient.")
      }
    } catch (err) {
      console.error("callNext transaction failed:", err)
      toast.error("Failed to update queue: " + err.message)
    }
  }

  // Add Patient to queue
  const addPatient = async (name, isPriority) => {
    if (!name.trim()) {
      toast.error("Patient name cannot be empty")
      return
    }

    if (useLocalFallback) {
      const currentQueue = getLocalQueue()
      if (!currentQueue.waiting) currentQueue.waiting = {}
      
      const waitingMap = currentQueue.waiting
      const waitingArrayLocal = Object.values(waitingMap)

      let newPosition = 1
      if (waitingArrayLocal.length > 0) {
        const positions = waitingArrayLocal.map(p => p.position || 0)
        if (isPriority) {
          newPosition = Math.min(...positions) - 1
        } else {
          newPosition = Math.max(...positions) + 1
        }
      }

      const nextTokenNum = (currentQueue.meta.lastTokenNumber || 0) + 1
      const tokenNumber = `T-${String(nextTokenNum).padStart(2, '0')}`
      const newId = `token_${Date.now()}`

      currentQueue.meta.lastTokenNumber = nextTokenNum
      currentQueue.waiting[newId] = {
        tokenNumber,
        patientName: name.trim(),
        isPriority,
        addedAt: Date.now(),
        position: newPosition
      }

      saveLocalQueue(currentQueue)
      toast.success(`Generated token ${tokenNumber} for ${name} (Local Mode)`)
      return
    }

    try {
      await runTransaction(ref(rtdb, 'queue'), (currentQueue) => {
        if (!currentQueue) {
          currentQueue = {
            current: null,
            waiting: {},
            meta: {
              avgConsultTimeMs: 300000,
              consultHistory: [],
              totalServedToday: 0,
              lastTokenNumber: 0,
              lastReset: Date.now()
            }
          }
        }
        
        if (!currentQueue.waiting) currentQueue.waiting = {}
        if (!currentQueue.meta) {
          currentQueue.meta = {
            avgConsultTimeMs: 300000,
            consultHistory: [],
            totalServedToday: 0,
            lastTokenNumber: 0,
            lastReset: Date.now()
          }
        }

        const waitingMap = currentQueue.waiting
        const waitingArrayLocal = Object.values(waitingMap)

        let newPosition = 1
        if (waitingArrayLocal.length > 0) {
          const positions = waitingArrayLocal.map(p => p.position || 0)
          if (isPriority) {
            newPosition = Math.min(...positions) - 1
          } else {
            newPosition = Math.max(...positions) + 1
          }
        }

        const nextTokenNum = (currentQueue.meta.lastTokenNumber || 0) + 1
        const tokenNumber = `T-${String(nextTokenNum).padStart(2, '0')}`
        const newId = `token_${Date.now()}`

        currentQueue.meta.lastTokenNumber = nextTokenNum
        currentQueue.waiting[newId] = {
          tokenNumber,
          patientName: name.trim(),
          isPriority,
          addedAt: Date.now(),
          position: newPosition
        }

        return currentQueue
      })
    } catch (err) {
      console.error("Add patient failed:", err)
      toast.error("Failed to add patient to queue: " + err.message)
    }
  }

  // Skip patient by ID
  const skipPatient = async (tokenId) => {
    try {
      if (useLocalFallback) {
        const currentQueue = getLocalQueue()
        if (tokenId === 'current') {
          const previousCurrent = currentQueue.current
          if (previousCurrent && previousCurrent.calledAt) {
            const duration = Date.now() - previousCurrent.calledAt
            if (!currentQueue.meta.consultHistory) currentQueue.meta.consultHistory = []
            currentQueue.meta.consultHistory.push(duration)
            if (currentQueue.meta.consultHistory.length > 10) currentQueue.meta.consultHistory.shift()
          }
          currentQueue.current = null
          saveLocalQueue(currentQueue)
          await callNext()
          toast.success("Skipped current patient (Local Mode).")
        } else {
          delete currentQueue.waiting[tokenId]
          saveLocalQueue(currentQueue)
          toast.success("Removed patient from queue (Local Mode).")
        }
        return
      }

      if (tokenId === 'current') {
        await runTransaction(ref(rtdb, 'queue'), (currentQueue) => {
          if (!currentQueue) return currentQueue
          
          const previousCurrent = currentQueue.current
          if (previousCurrent && previousCurrent.calledAt) {
            const duration = Date.now() - previousCurrent.calledAt
            if (!currentQueue.meta) currentQueue.meta = {}
            if (!currentQueue.meta.consultHistory) currentQueue.meta.consultHistory = []
            currentQueue.meta.consultHistory.push(duration)
            if (currentQueue.meta.consultHistory.length > 10) {
              currentQueue.meta.consultHistory.shift()
            }
          }
          currentQueue.current = null
          return currentQueue
        })
        await callNext()
        toast.success("Skipped current patient.")
      } else {
        await remove(ref(rtdb, `queue/waiting/${tokenId}`))
        toast.success("Removed patient from queue.")
      }
    } catch (err) {
      console.error("Skip patient failed:", err)
      toast.error("Failed to skip patient: " + err.message)
    }
  }

  // Reset the Queue
  const resetQueue = async () => {
    if (useLocalFallback) {
      const data = {
        current: null,
        waiting: null,
        meta: {
          avgConsultTimeMs: 300000,
          consultHistory: [],
          totalServedToday: 0,
          lastTokenNumber: 0,
          lastReset: Date.now()
        }
      }
      saveLocalQueue(data)
      toast.success("Queue reset successfully (Local Mode)!")
      return
    }

    try {
      const queueRef = ref(rtdb, 'queue')
      await set(queueRef, {
        current: null,
        waiting: null,
        meta: {
          avgConsultTimeMs: 300000,
          consultHistory: [],
          totalServedToday: 0,
          lastTokenNumber: 0,
          lastReset: Date.now()
        }
      })
      toast.success("Queue reset successfully!")
    } catch (err) {
      console.error("Reset queue failed:", err)
      toast.error("Failed to reset queue: " + err.message)
    }
  }

  // Set Average Consultation time
  const setAvgTime = async (minutes) => {
    const minsNum = parseFloat(minutes)
    if (isNaN(minsNum) || minsNum <= 0) {
      toast.error("Please enter a valid number of minutes")
      return
    }
    const ms = minsNum * 60 * 1000

    if (useLocalFallback) {
      const currentQueue = getLocalQueue()
      currentQueue.meta.avgConsultTimeMs = ms
      saveLocalQueue(currentQueue)
      toast.success(`Average consultation time updated to ${minsNum} mins (Local Mode)`)
      return
    }

    try {
      await set(ref(rtdb, 'queue/meta/avgConsultTimeMs'), ms)
      toast.success(`Average consultation time updated to ${minsNum} mins`)
    } catch (err) {
      console.error("Set avg time failed:", err)
      toast.error("Failed to update avg consult time: " + err.message)
    }
  }

  return {
    state: { current, waiting, meta, isLoading, waitingList },
    actions: { addPatient, callNext, skipPatient, resetQueue, setAvgTime },
    getETAForIndex,
    rollingAvg,
    useLocalFallback
  }
}
