;; Simple Batch Fee Token Factory
;; Handles fee payments for multiple tokens at once

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-insufficient-fee (err u101))
(define-constant err-transfer-failed (err u102))
(define-constant deployer-fee-address 'ST1M4XB0KP2FPT1NFQQWV0MR3CE5SP2B3P4ZK9ZSR) ;; Address exempt from deployment fee

;; Data Variables
(define-data-var fee-collector principal 'ST1M4XB0KP2FPT1NFQQWV0MR3CE5SP2B3P4ZK9ZSR)
(define-data-var deployment-fee uint u1000000) ;; 1 STX default

;; Maps to track transactions and balances
(define-map transaction-status (string-ascii 64) {
    status: (string-ascii 20),
    amount: uint,
    timestamp: uint
})

;; Read-only functions
(define-read-only (get-deployment-fee)
    (ok (var-get deployment-fee)))

(define-read-only (get-transaction-status (tx-id (string-ascii 64)))
    (ok (map-get? transaction-status tx-id)))

(define-read-only (get-balance (address principal))
    (stx-get-balance address))

;; Public functions
(define-public (pay-deployment-fee)
    (let (
        (fee (var-get deployment-fee))
        (collector (var-get fee-collector))
    )
    (if (is-eq tx-sender deployer-fee-address)
        ;; If sender is the fee-exempt deployer, bypass fee payment
        (begin
            (print { topic: "deployment_fee_skipped", deployer: tx-sender })
            (ok u0) ;; Return 0 fee paid
        )
        ;; Otherwise, proceed with normal fee payment
        (begin
            ;; Direct transfer to fee collector
            (try! (stx-transfer? fee tx-sender collector))
            ;; Record transaction status
            (map-set transaction-status (to-ascii 64 (get-burn-block-info? header-hash u0))
                {
                    status: "completed",
                    amount: fee,
                    timestamp: (get-burn-block-info? timestamp u0)
                })
            (ok fee) ;; Return the fee paid
        )
    )))

;; Admin functions
(define-public (set-fee-collector (new-collector principal))
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-owner-only)
        (var-set fee-collector new-collector)
        (ok true)))

(define-public (set-deployment-fee (new-fee uint))
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-owner-only)
        (var-set deployment-fee new-fee)
        (ok true))) 