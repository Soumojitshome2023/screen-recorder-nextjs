"use client"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Mic,
  MicOff,
  Monitor,
  Download,
  Video,
  VideoOff,
  Pause,
  Play
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function ScreenRecorderSec() {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [recordedBlob, setRecordedBlob] = useState(null)
  const [downloadUrl, setDownloadUrl] = useState("")
  const [micEnabled, setMicEnabled] = useState(true)
  const [systemAudioEnabled, setSystemAudioEnabled] = useState(true)

  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const videoRef = useRef(null)  // Ref for the preview video element
  const startTimeRef = useRef(0)  // Ref to track the start time

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = "You have an active recording. Are you sure you want to leave?"
      return e.returnValue
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      stopRecording()
      clearInterval(timerRef.current)
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl)
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      chunksRef.current = []

      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" },
        audio: systemAudioEnabled,
      })

      if (micEnabled) {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        micStream.getAudioTracks().forEach((track) => {
          displayStream.addTrack(track)
        })
      }

      streamRef.current = displayStream

      const mediaRecorder = new MediaRecorder(displayStream)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" })
        setRecordedBlob(blob)

        const url = URL.createObjectURL(blob)
        setDownloadUrl(url)

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop())
        }
        streamRef.current = null
        clearInterval(timerRef.current)  // Stop the timer when recording stops
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      startTimeRef.current = Date.now()

      // Start the timer when the recording starts
      timerRef.current = setInterval(() => {
        const elapsedTime = Math.floor((Date.now() - startTimeRef.current) / 1000)
        setRecordingTime(elapsedTime)
      }, 1000)

      // Update video element with the stream for preview
      if (videoRef.current) {
        videoRef.current.srcObject = displayStream
      }
    } catch (error) {
      console.error("Recording error:", error)
      alert(`Error: ${error.message}`)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.pause()
      clearInterval(timerRef.current)  // Pause the timer
      setIsPaused(true)
    }
  }

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isPaused) {
      mediaRecorderRef.current.resume()
      startTimeRef.current = Date.now() - recordingTime * 1000  // Adjust start time to resume
      timerRef.current = setInterval(() => {
        const elapsedTime = Math.floor((Date.now() - startTimeRef.current) / 1000)
        setRecordingTime(elapsedTime)
      }, 1000)
      setIsPaused(false)
    }
  }

  const formatTime = (seconds) => {
    const mins = String(Math.floor(seconds / 60)).padStart(2, "0")
    const secs = String(seconds % 60).padStart(2, "0")
    return `${mins}:${secs}`
  }

  const handleDownload = () => {
    if (downloadUrl) {
      const a = document.createElement("a")
      a.href = downloadUrl
      a.download = `screen-recording-${new Date().toISOString()}.webm`
      a.click()
    }
  }

  const resetRecording = () => {
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl)
    }
    setRecordedBlob(null)
    setDownloadUrl("")
    setRecordingTime(0)
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Screen Recorder</CardTitle>
        <CardDescription>Record your screen with audio options</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {!isRecording && !recordedBlob && (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                <Label htmlFor="mic-toggle">Microphone Audio</Label>
              </div>
              <Switch id="mic-toggle" checked={micEnabled} onCheckedChange={setMicEnabled} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Monitor className="h-4 w-4" />
                <Label htmlFor="system-audio-toggle">System Audio</Label>
              </div>
              <Switch
                id="system-audio-toggle"
                checked={systemAudioEnabled}
                onCheckedChange={setSystemAudioEnabled}
              />
            </div>
          </>
        )}

        {isRecording && (
          <div className="text-center space-y-4">
            <div className="flex justify-center items-center">
              <div className="h-4 w-4 rounded-full bg-red-500 animate-pulse mr-2"></div>
              <span className="text-lg font-medium">
                Recording: {formatTime(recordingTime)}
              </span>
            </div>
            <div className="space-y-2">
              <Button onClick={pauseRecording} disabled={isPaused} variant="outline" className="w-full">
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </Button>
              <Button onClick={resumeRecording} disabled={!isPaused} variant="outline" className="w-full">
                <Play className="mr-2 h-4 w-4" />
                Resume
              </Button>
            </div>
          </div>
        )}

        {/* Preview during recording */}
        <div className="rounded-lg overflow-hidden bg-black">
          <video
            ref={videoRef}
            autoPlay
            muted
            className="w-full h-auto"
          />
        </div>

        {recordedBlob && !isRecording && (
          <div className="space-y-4">
            <div className="rounded-lg overflow-hidden bg-black">
              <video ref={videoRef} src={downloadUrl} controls className="w-full h-auto" />
            </div>
            <div className="flex justify-between text-sm">
              <span>Duration: {formatTime(recordingTime)}</span>
              <span>Size: {(recordedBlob.size / (1024 * 1024)).toFixed(1)} MB</span>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-2">
        {!isRecording && !recordedBlob && (
          <Button onClick={startRecording} className="w-full">
            <Video className="mr-2 h-4 w-4" />
            Start Recording
          </Button>
        )}

        {isRecording && (
          <Button onClick={stopRecording} variant="destructive" className="w-full">
            <VideoOff className="mr-2 h-4 w-4" />
            Stop Recording
          </Button>
        )}

        {recordedBlob && !isRecording && (
          <div className="flex w-full gap-2">
            <Button variant="outline" onClick={resetRecording} className="w-full">
              Record Again
            </Button>
            <Button onClick={handleDownload} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  )
}
