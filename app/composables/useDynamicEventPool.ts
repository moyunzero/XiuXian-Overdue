/**
 * 动态事件池 - IndexedDB 管理
 * 负责动态事件的存储、检索、淘汰与种子库导入
 */
import type { EventDefinition } from '~/types/game'

const DB_NAME = 'xiuxian-events-db'
const DB_VERSION = 2
const STORE_NAME = 'dynamic-events'
const SEED_IMPORTED_KEY = '__seed_imported_flag__'

// 存储上限估算 (50MB)
const MAX_STORAGE_BYTES = 50 * 1024 * 1024
// 淘汰比例 (20%)
const EVICT_RATIO = 0.2

let db: IDBDatabase | null = null

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db)
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('source', 'source', { unique: false })
        store.createIndex('createdAt', 'createdAt', { unique: false })
        store.createIndex('family', 'event.family', { unique: false })
      }
    }
    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }
    request.onerror = () => reject(request.error)
  })
}

function estimateDbSize(records: Array<{ event: EventDefinition }>): number {
  let size = 0
  for (const r of records) {
    size += JSON.stringify(r).length * 2 // Approximate UTF-16 size
  }
  return size
}

export function useDynamicEventPool() {
  const init = async (): Promise<void> => {
    if (import.meta.server) return
    await openDb()
  }

  const importSeedEvents = async (events: EventDefinition[]): Promise<number> => {
    if (import.meta.server || !db) return 0
    if (await isSeedImported()) return 0

    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const now = Date.now()

    for (const event of events) {
      store.put({
        id: event.id,
        event,
        source: 'seed',
        createdAt: now,
        triggerCount: 0
      })
    }

    // 标记种子库已导入
    store.put({
      id: SEED_IMPORTED_KEY,
      source: 'system',
      createdAt: now,
      triggerCount: 0
    } as any)

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(events.length)
      tx.onerror = () => reject(tx.error)
    })
  }

  const checkAndEvict = async () => {
    if (!db) return
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.getAll()

    return new Promise<void>((resolve) => {
      request.onsuccess = () => {
        const records = request.result as Array<{ id: string; event: EventDefinition }>
        const size = estimateDbSize(records)
        if (size > MAX_STORAGE_BYTES) {
          const count = Math.ceil(records.length * EVICT_RATIO)
          evictOldest(count)
        }
        resolve()
      }
      request.onerror = () => resolve()
    })
  }

  const evictOldest = (count: number) => {
    if (!db) return
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index('createdAt')
    const cursorReq = index.openCursor()
    let deleted = 0

    cursorReq.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
      if (cursor && deleted < count) {
        if (cursor.value.id !== SEED_IMPORTED_KEY) {
          cursor.delete()
          deleted++
        }
        cursor.continue()
      }
    }
  }

  const insertAiEvents = async (events: EventDefinition[]): Promise<number> => {
    if (import.meta.server || !db) return 0
    
    await checkAndEvict()

    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const now = Date.now()

    for (const event of events) {
      try {
        store.add({
          id: event.id,
          event,
          source: 'ai',
          createdAt: now,
          triggerCount: 0
        })
      } catch {
        // 忽略重复 ID 错误
      }
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(events.length)
      tx.onerror = () => reject(tx.error)
    })
  }

  const getAllEvents = async (): Promise<EventDefinition[]> => {
    if (import.meta.server || !db) return []
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.getAll()

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const records = request.result as Array<{ id: string; event: EventDefinition }>
        resolve(records.filter(r => r.id !== SEED_IMPORTED_KEY).map(r => r.event))
      }
      request.onerror = () => reject(request.error)
    })
  }

  const recordEventTrigger = async (eventId: string, day: number): Promise<void> => {
    if (import.meta.server || !db) return
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(eventId)

    request.onsuccess = () => {
      const record = request.result
      if (record) {
        record.event.lastTriggeredDay = day
        record.lastTriggeredAt = Date.now()
        record.triggerCount = (record.triggerCount || 0) + 1
        store.put(record)
      }
    }
  }

  const getEventCount = async (): Promise<number> => {
    if (import.meta.server || !db) return 0
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.count()

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(Math.max(0, request.result - 1)) // 减去种子库标记
      request.onerror = () => reject(request.error)
    })
  }

  const isSeedImported = async (): Promise<boolean> => {
    if (import.meta.server || !db) return false
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(SEED_IMPORTED_KEY)

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(!!request.result)
      request.onerror = () => reject(request.error)
    })
  }

  return {
    init,
    importSeedEvents,
    insertAiEvents,
    getAllEvents,
    recordEventTrigger,
    getEventCount,
    isSeedImported
  }
}
