;; Emissions Reporting Contract
;; Tracks greenhouse gas production over time

(define-data-var admin principal tx-sender)

;; Emissions report data structure
(define-map emissions-reports
  { report-id: (string-ascii 64) }
  {
    entity-id: (string-ascii 64),
    methodology-id: (string-ascii 64),
    emissions-amount: uint,
    reporting-period-start: uint,
    reporting-period-end: uint,
    submission-date: uint,
    status: (string-ascii 16)
  }
)

;; Entity reports mapping to track all reports by an entity
(define-map entity-reports
  { entity-id: (string-ascii 64) }
  { report-ids: (list 100 (string-ascii 64)) }
)

;; Submit a new emissions report
(define-public (submit-report
                (report-id (string-ascii 64))
                (entity-id (string-ascii 64))
                (methodology-id (string-ascii 64))
                (emissions-amount uint)
                (reporting-period-start uint)
                (reporting-period-end uint))
  (let ((current-reports (default-to { report-ids: (list) } (map-get? entity-reports { entity-id: entity-id }))))
    (begin
      ;; Only admin can submit reports for now
      (asserts! (is-eq tx-sender (var-get admin)) (err u403))
      (asserts! (not (is-some (map-get? emissions-reports { report-id: report-id }))) (err u100))

      ;; Store the report
      (map-set emissions-reports
        { report-id: report-id }
        {
          entity-id: entity-id,
          methodology-id: methodology-id,
          emissions-amount: emissions-amount,
          reporting-period-start: reporting-period-start,
          reporting-period-end: reporting-period-end,
          submission-date: block-height,
          status: "pending"
        }
      )

      ;; Update entity reports list
      (ok (map-set entity-reports
        { entity-id: entity-id }
        { report-ids: (unwrap! (as-max-len? (append (get report-ids current-reports) report-id) u100) (err u101)) }
      ))
    )
  )
)

;; Verify an emissions report
(define-public (verify-report (report-id (string-ascii 64)))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u403))
    (match (map-get? emissions-reports { report-id: report-id })
      report (ok (map-set emissions-reports
                  { report-id: report-id }
                  (merge report { status: "verified" })))
      (err u404)
    )
  )
)

;; Get report details
(define-read-only (get-report (report-id (string-ascii 64)))
  (map-get? emissions-reports { report-id: report-id })
)

;; Get all reports for an entity
(define-read-only (get-entity-reports (entity-id (string-ascii 64)))
  (map-get? entity-reports { entity-id: entity-id })
)

;; Transfer admin rights
(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u403))
    (ok (var-set admin new-admin))
  )
)
