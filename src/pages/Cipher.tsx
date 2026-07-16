import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { KeyRound, Eye, EyeOff, Braces, Copy, Check, ArrowDown, ArrowUp } from 'lucide-react'
import { cipherApi } from '@/api/cipher'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const KEY_STORAGE = 'cipher_aes_key'
const VALID_KEY_LENGTHS = [16, 24, 32]

function isValidKeyLength(key: string) {
  return VALID_KEY_LENGTHS.includes(key.length)
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="rounded-3xl border border-(--border) bg-(--card) p-6"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  )
}

function useCopy() {
  const [copied, setCopied] = useState(false)
  const copy = async (text: string) => {
    if (!text) return
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }
  return { copied, copy }
}

export function CipherPage() {
  const [key, setKey] = useState(() => localStorage.getItem(KEY_STORAGE) ?? '')
  const [showKey, setShowKey] = useState(false)
  const [plaintext, setPlaintext] = useState('')
  const [ciphertext, setCiphertext] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)

  useEffect(() => {
    localStorage.setItem(KEY_STORAGE, key)
  }, [key])

  const keyValid = isValidKeyLength(key)

  const encrypt = useMutation({
    mutationFn: cipherApi.encrypt,
    onSuccess: (result) => setCiphertext(result),
  })

  const decrypt = useMutation({
    mutationFn: cipherApi.decrypt,
    onSuccess: (result) => setPlaintext(result),
  })

  function formatJSON() {
    setJsonError(null)
    if (!plaintext.trim()) return
    try {
      setPlaintext(JSON.stringify(JSON.parse(plaintext), null, 2))
    } catch {
      setJsonError('ข้อความนี้ไม่ใช่ JSON ที่ถูกต้อง')
    }
  }

  const cipherCopy = useCopy()
  const plainCopy = useCopy()

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <motion.div
        className="flex items-center gap-2.5"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <KeyRound size={26} style={{ color: 'oklch(0.62 0.13 42)' }} />
        <h1 className="text-3xl font-black tracking-tight leading-none">Cipher (IV from length)</h1>
      </motion.div>

      {/* ── Key panel ── */}
      <Panel>
        <label className="text-[10px] font-black uppercase tracking-[0.22em] text-(--muted-foreground)">
          AES-GCM Key
        </label>
        <div className="relative mt-2.5">
          <Input
            type={showKey ? 'text' : 'password'}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="16 / 24 / 32-byte key"
            className={cn('pr-10 font-mono', key && !keyValid && 'border-(--destructive)')}
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-(--muted-foreground) hover:text-(--foreground) transition-colors"
          >
            {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        <p className={cn('text-xs mt-2', key && !keyValid ? 'text-(--destructive)' : 'text-(--muted-foreground)')}>
          {key && !keyValid
            ? `ความยาวคีย์ต้องเป็น 16, 24 หรือ 32 ตัวอักษร (ตอนนี้ ${key.length})`
            : 'เก็บไว้ในเบราว์เซอร์นี้เท่านั้น (localStorage) ไม่ถูกส่งไปที่อื่นนอกจาก request ที่คุณกดเอง'}
        </p>
      </Panel>

      {/* ── Plaintext panel ── */}
      <Panel>
        <label className="text-[10px] font-black uppercase tracking-[0.22em] text-(--muted-foreground)">
          Plaintext
        </label>
        <Textarea
          className="mt-2.5 font-mono"
          rows={4}
          value={plaintext}
          onChange={(e) => { setPlaintext(e.target.value); setJsonError(null) }}
          placeholder="ข้อความที่จะเข้ารหัส..."
        />
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <Button
            size="sm"
            className="gap-1.5 rounded-xl"
            disabled={!keyValid || !plaintext || encrypt.isPending}
            onClick={() => encrypt.mutate({ text: plaintext, key })}
          >
            <ArrowDown size={14} />
            เข้ารหัส
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 rounded-xl"
            disabled={!ciphertext}
            onClick={() => cipherCopy.copy(ciphertext)}
          >
            {cipherCopy.copied ? <Check size={14} /> : <Copy size={14} />}
            คัดลอก cipher text
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5 rounded-xl" onClick={formatJSON}>
            <Braces size={14} />
            จัดรูปแบบ JSON
          </Button>
        </div>
        {jsonError && <p className="text-xs text-(--destructive) mt-2">{jsonError}</p>}
        {encrypt.isError && (
          <p className="text-xs text-(--destructive) mt-2">เข้ารหัสไม่สำเร็จ ตรวจสอบคีย์อีกครั้ง</p>
        )}
      </Panel>

      {/* ── Ciphertext panel ── */}
      <Panel>
        <label className="text-[10px] font-black uppercase tracking-[0.22em] text-(--muted-foreground)">
          Ciphertext (hex)
        </label>
        <Textarea
          className="mt-2.5 font-mono"
          rows={4}
          value={ciphertext}
          onChange={(e) => setCiphertext(e.target.value)}
          placeholder="hex ciphertext ที่จะถอดรหัส..."
        />
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <Button
            size="sm"
            className="gap-1.5 rounded-xl"
            disabled={!keyValid || !ciphertext || decrypt.isPending}
            onClick={() => decrypt.mutate({ text: ciphertext, key })}
          >
            <ArrowUp size={14} />
            ถอดรหัส
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 rounded-xl"
            disabled={!plaintext}
            onClick={() => plainCopy.copy(plaintext)}
          >
            {plainCopy.copied ? <Check size={14} /> : <Copy size={14} />}
            คัดลอก plain text
          </Button>
        </div>
        {decrypt.isError && (
          <p className="text-xs text-(--destructive) mt-2">ถอดรหัสไม่สำเร็จ ตรวจสอบคีย์หรือข้อความที่เข้ารหัส</p>
        )}
      </Panel>
    </div>
  )
}
