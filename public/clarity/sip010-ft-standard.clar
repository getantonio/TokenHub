;; Simple Clarity Token
;; A minimal SIP-010 implementation with no dependencies

;; Data Variables
(define-data-var token-name (string-ascii 32) "{TOKEN_NAME}")
(define-data-var token-symbol (string-ascii 32) "{TOKEN_SYMBOL}")
(define-data-var token-decimals uint u{TOKEN_DECIMALS})
(define-data-var token-uri (optional (string-utf8 256)) {TOKEN_URI})
(define-data-var total-supply uint u{INITIAL_SUPPLY})

;; Map for token balances
(define-map balances principal uint)

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-token-owner (err u101))

;; Read-only functions
(define-read-only (get-name)
  (ok (var-get token-name)))

(define-read-only (get-symbol)
  (ok (var-get token-symbol)))

(define-read-only (get-decimals)
  (ok (var-get token-decimals)))

(define-read-only (get-balance (account principal))
  (ok (default-to u0 (map-get? balances account))))

(define-read-only (get-total-supply)
  (ok (var-get total-supply)))

(define-read-only (get-token-uri)
  (ok (var-get token-uri)))

;; Public functions
(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
  (begin
    (asserts! (is-eq tx-sender sender) err-not-token-owner)
    (let ((sender-balance (default-to u0 (map-get? balances sender))))
      (asserts! (>= sender-balance amount) (err u1))
      (map-set balances sender (- sender-balance amount))
      (map-set balances recipient (+ (default-to u0 (map-get? balances recipient)) amount))
      (ok true))))

;; Initialize contract
(begin
  (map-set balances contract-owner (var-get total-supply))
  (print { topic: "ft_mint", amount: (var-get total-supply), recipient: contract-owner })
) 