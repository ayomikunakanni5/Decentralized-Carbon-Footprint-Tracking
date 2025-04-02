;; Entity Registration Contract
;; Records companies measuring emissions

(define-data-var admin principal tx-sender)

;; Entity data structure
(define-map entities
  { entity-id: (string-ascii 64) }
  {
    name: (string-ascii 256),
    registration-date: uint,
    status: (string-ascii 16),
    industry: (string-ascii 64)
  }
)

;; Register a new entity
(define-public (register-entity (entity-id (string-ascii 64)) (name (string-ascii 256)) (industry (string-ascii 64)))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u403))
    (asserts! (not (is-some (map-get? entities { entity-id: entity-id }))) (err u100))
    (ok (map-set entities
      { entity-id: entity-id }
      {
        name: name,
        registration-date: block-height,
        status: "pending",
        industry: industry
      }
    ))
  )
)

;; Verify an entity
(define-public (verify-entity (entity-id (string-ascii 64)))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u403))
    (match (map-get? entities { entity-id: entity-id })
      entity (ok (map-set entities
                  { entity-id: entity-id }
                  (merge entity { status: "verified" })))
      (err u404)
    )
  )
)

;; Get entity details
(define-read-only (get-entity (entity-id (string-ascii 64)))
  (map-get? entities { entity-id: entity-id })
)

;; Transfer admin rights
(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u403))
    (ok (var-set admin new-admin))
  )
)
