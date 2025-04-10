;; Token Template Contract
;; Designed to work with batch deployment factory

;; Data Variables
(define-data-var token-name (string-ascii 32) "")
(define-data-var token-symbol (string-ascii 32) "")
(define-data-var token-decimals uint u6)
(define-data-var token-uri (optional (string-utf8 256)) none)
(define-data-var total-supply uint u0)
(define-data-var initialized bool false)

;; Map for token balances
(define-map balances principal uint)

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-token-owner (err u101))
(define-constant err-already-initialized (err u102))
(define-constant err-not-initialized (err u103))

;; Initialize function - can only be called once by the factory
(define-public (initialize (name (string-ascii 32)) (symbol (string-ascii 10)) (supply uint))
    (begin
        (asserts! (not (var-get initialized)) err-already-initialized)
        (var-set token-name name)
        (var-set token-symbol symbol)
        (var-set total-supply supply)
        (var-set initialized true)
        (map-set balances tx-sender supply)
        (print {
            topic: "token_initialized",
            name: name,
            symbol: symbol,
            supply: supply,
            owner: tx-sender
        })
        (ok tx-sender)))

;; Read-only functions
(define-read-only (get-name)
    (begin
        (asserts! (var-get initialized) err-not-initialized)
        (ok (var-get token-name))))

(define-read-only (get-symbol)
    (begin
        (asserts! (var-get initialized) err-not-initialized)
        (ok (var-get token-symbol))))

(define-read-only (get-decimals)
    (begin
        (asserts! (var-get initialized) err-not-initialized)
        (ok (var-get token-decimals))))

(define-read-only (get-balance (account principal))
    (begin
        (asserts! (var-get initialized) err-not-initialized)
        (ok (default-to u0 (map-get? balances account)))))

(define-read-only (get-total-supply)
    (begin
        (asserts! (var-get initialized) err-not-initialized)
        (ok (var-get total-supply))))

(define-read-only (get-token-uri)
    (begin
        (asserts! (var-get initialized) err-not-initialized)
        (ok (var-get token-uri))))

;; Public functions
(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
    (begin
        (asserts! (var-get initialized) err-not-initialized)
        (asserts! (is-eq tx-sender sender) err-not-token-owner)
        (let ((sender-balance (default-to u0 (map-get? balances sender))))
            (asserts! (>= sender-balance amount) (err u1))
            (map-set balances sender (- sender-balance amount))
            (map-set balances recipient (+ (default-to u0 (map-get? balances recipient)) amount))
            (print {
                topic: "ft_transfer",
                amount: amount,
                sender: sender,
                recipient: recipient
            })
            (ok true)))) 