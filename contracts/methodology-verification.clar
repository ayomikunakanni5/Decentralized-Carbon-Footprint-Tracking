;; Methodology Verification Contract
;; Validates calculation approaches

(define-data-var admin principal tx-sender)

;; Methodology data structure
(define-map methodologies
  { methodology-id: (string-ascii 64) }
  {
    name: (string-ascii 256),
    description: (string-ascii 512),
    creation-date: uint,
    status: (string-ascii 16),
    industry: (string-ascii 64)
  }
)

;; Register a new methodology
(define-public (register-methodology
                (methodology-id (string-ascii 64))
                (name (string-ascii 256))
                (description (string-ascii 512))
                (industry (string-ascii 64)))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u403))
    (asserts! (not (is-some (map-get? methodologies { methodology-id: methodology-id }))) (err u100))
    (ok (map-set methodologies
      { methodology-id: methodology-id }
      {
        name: name,
        description: description,
        creation-date: block-height,
        status: "pending",
        industry: industry
      }
    ))
  )
)

;; Verify a methodology
(define-public (verify-methodology (methodology-id (string-ascii 64)))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u403))
    (match (map-get? methodologies { methodology-id: methodology-id })
      methodology (ok (map-set methodologies
                        { methodology-id: methodology-id }
                        (merge methodology { status: "verified" })))
      (err u404)
    )
  )
)

;; Get methodology details
(define-read-only (get-methodology (methodology-id (string-ascii 64)))
  (map-get? methodologies { methodology-id: methodology-id })
)

;; Transfer admin rights
(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u403))
    (ok (var-set admin new-admin))
  )
)
