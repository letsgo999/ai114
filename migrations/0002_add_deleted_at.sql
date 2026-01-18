-- 휴지통 기능을 위한 deleted_at 컬럼 추가
-- 소프트 삭제: deleted_at이 NULL이 아니면 삭제된 상태
-- 30일 후 영구 삭제 예정

ALTER TABLE tasks ADD COLUMN deleted_at INTEGER DEFAULT NULL;

-- 삭제된 항목 조회 성능을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at);
