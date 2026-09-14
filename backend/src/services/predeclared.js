/**
 * 预申报两路径完成条件的共享 SQL 片段（单一数据源，避免各处硬编码复合条件）。
 *
 * 两条路径：
 *  - 代缴：客户转账、我们代缴 EKO-PUNKT → recycling_prepaid 已付（status='paid'）
 *  - 自行：客户已自行申报，上传发票 → pre_declared_status='approved'
 *
 * 别名约定：片段里的 `c` = contracts 表（需调用方 SQL 已 `JOIN contracts c`）。
 */

/** 代缴已付（recycling_prepaid paid） */
export const COLLECT_PAID_SQL =
  "c.id IN (SELECT contract_id FROM payments WHERE payment_type = 'recycling_prepaid' AND status = 'paid')"

/** 自行申报已确认 */
export const SELF_APPROVED_SQL = "c.pre_declared_status = 'approved'"

/** 非自行申报（NULL 或未确认）——用于「仅代缴」类导出/筛选 */
export const NOT_SELF_APPROVED_SQL =
  "(c.pre_declared_status IS NULL OR c.pre_declared_status != 'approved')"

/** 预申报已完成 = 代缴已付 OR 自行已确认 */
export const PRE_DECLARED_DONE_SQL = `(${COLLECT_PAID_SQL} OR ${SELF_APPROVED_SQL})`
