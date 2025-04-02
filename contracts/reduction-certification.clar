;; Reduction Certification Contract
;; Verifies successful emissions decreases

(define-data-var admin principal tx-sender)

;; Certificate data structure
(define-map certificates
  { certificate-id: (string-ascii 64) }
  {
    entity-id: (string-ascii 64),
    baseline-report-id: (string-ascii 64),
    current-report-id: (string-ascii 64),
    reduction-amount: uint,
    issuance-date: uint,
    expiration-date: uint,
    status: (string-ascii 16)
  }
)

;; Entity certificates mapping
(define-map entity-certificates
  { entity-id: (string-ascii 64) }
  { certificate-ids: (list 100 (string-ascii 64)) }
)

;; Issue a new reduction certificate
(define-public (issue-certificate
                (certificate-id (string-ascii 64))
                (entity-id (string-ascii 64))
                (baseline-report-id (string-ascii 64))
                (current-report-id (string-ascii 64))
                (reduction-amount uint)
                (validity-period uint))
  (let ((current-certs (default-to { certificate-ids: (list) } (map-get? entity-certificates { entity-id: entity-id }))))
    (begin
      (asserts! (is-eq tx-sender (var-get admin)) (err u403))
      (asserts! (not (is-some (map-get? certificates { certificate-id: certificate-id }))) (err u100))

      ;; Store the certificate
      (map-set certificates
        { certificate-id: certificate-id }
        {
          entity-id: entity-id,
          baseline-report-id: baseline-report-id,
          current-report-id: current-report-id,
          reduction-amount: reduction-amount,
          issuance-date: block-height,
          expiration-date: (+ block-height validity-period),
          status: "active"
        }
      )

      ;; Update entity certificates list
      (ok (map-set entity-certificates
        { entity-id: entity-id }
        { certificate-ids: (unwrap! (as-max-len? (append (get certificate-ids current-certs) certificate-id) u100) (err u101)) }
      ))
    )
  )
)

;; Revoke a certificate
(define-public (revoke-certificate (certificate-id (string-ascii 64)))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u403))
    (match (map-get? certificates { certificate-id: certificate-id })
      certificate (ok (map-set certificates
                       { certificate-id: certificate-id }
                       (merge certificate { status: "revoked" })))
      (err u404)
    )
  )
)

;; Get certificate details
(define-read-only (get-certificate (certificate-id (string-ascii 64)))
  (map-get? certificates { certificate-id: certificate-id })
)

;; Get all certificates for an entity
(define-read-only (get-entity-certificates (entity-id (string-ascii 64)))
  (map-get? entity-certificates { entity-id: entity-id })
)

;; Verify if a certificate is valid
(define-read-only (is-certificate-valid (certificate-id (string-ascii 64)))
  (match (map-get? certificates { certificate-id: certificate-id })
    certificate (and
                  (is-eq (get status certificate) "active")
                  (<= block-height (get expiration-date certificate)))
    false
  )
)

;; Transfer admin rights
(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u403))
    (ok (var-set admin new-admin))
  )
)
