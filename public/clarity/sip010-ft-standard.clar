\
;; sip010-ft-standard.clar
;; A standard SIP-010 Fungible Token implementation
;; This contract is intended to be deployed multiple times, once per token.
;; Initial parameters (name, symbol, decimals, initial supply, owner) are set during deployment.

;; Traits
(impl-trait 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard.sip-010-trait)

;; Constants
(define-constant contract-owner tx-sender) ;; Initial owner is the deployer
(define-constant err-owner-only (err u100))
(define-constant err-not-token-owner (err u101))
(define-constant err-amount-zero (err u102))
(define-constant err-insufficient-balance (err u103))
(define-constant err-recipient-equals-sender (err u104))

;; Data Variables
(define-data-var token-name (string-ascii 20) "") ;; Max 20 chars for name
(define-data-var token-symbol (string-ascii 10) "") ;; Max 10 chars for symbol
(define-data-var token-decimals uint u0)
(define-data-var token-uri (optional (string-utf8 256)) none) ;; Optional URI
(define-data-var total-supply uint u0)

;; Data Maps
(define-map balances principal uint)

;; --- SIP-010 Trait Functions ---

;; Get the token name
(define-read-only (get-name)
  (ok (var-get token-name))
)

;; Get the token symbol
(define-read-only (get-symbol)
  (ok (var-get token-symbol))
)

;; Get the number of decimals
(define-read-only (get-decimals)
  (ok (var-get token-decimals))
)

;; Get the balance of a specific principal
(define-read-only (get-balance (account principal))
  (ok (default-to u0 (map-get? balances account)))
)

;; Get the total supply of the token
(define-read-only (get-total-supply)
  (ok (var-get total-supply))
)

;; Get the token URI (optional)
(define-read-only (get-token-uri)
  (ok (var-get token-uri))
)

;; Transfer tokens from sender to recipient
(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
  (begin
    (asserts! (is-eq tx-sender sender) err-not-token-owner)
    (asserts! (> amount u0) err-amount-zero)
    (asserts! (not (is-eq sender recipient)) err-recipient-equals-sender)

    (let ((sender-balance (get-balance sender)))
      (asserts! (>= (unwrap-panic sender-balance) amount) err-insufficient-balance)

      ;; Debit sender
      (map-set balances sender (- (unwrap-panic sender-balance) amount))
      ;; Credit recipient
      (map-set balances recipient (+ (unwrap-panic (get-balance recipient)) amount))

      ;; Print transfer event (conforms to SIP-010)
      (print {
          topic: "ft_transfer_event",
          value: {
              asset_identifier: (as-contract tx-sender), ;; Use contract address as identifier
              sender: sender,
              recipient: recipient,
              amount: amount,
              memo: memo ;; Include memo if provided
          }
      })

      (ok true)
    )
  )
)

;; --- Initialization (Called once on deployment) ---
;; The frontend logic will construct the deployment with user-provided values.
(begin
  ;; These var-sets will be overridden by the deployment transaction parameters
  (var-set token-name "{TOKEN_NAME}") ;; Placeholder for user input
  (var-set token-symbol "{TOKEN_SYMBOL}") ;; Placeholder for user input
  (var-set token-decimals u{TOKEN_DECIMALS}) ;; Placeholder for user input (usually u6)
  (let ((initial-supply u{INITIAL_SUPPLY})) ;; Placeholder for user input
    (var-set total-supply initial-supply)
    (map-set balances contract-owner initial-supply) ;; Mint initial supply to deployer
    (print { topic: "ft_mint_event", value: { asset_identifier: (as-contract tx-sender), recipient: contract-owner, amount: initial-supply } })
  )
  (var-set token-uri {TOKEN_URI}) ;; Placeholder for optional user input (can be none)
  (print { topic: "sip010_ft_standard_init", contract: (as-contract tx-sender), owner: contract-owner })
)

;; --- Optional Owner Functions ---

;; Mint new tokens (only callable by contract owner)
(define-public (mint (amount uint) (recipient principal))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (asserts! (> amount u0) err-amount-zero)

    (let ((new-supply (+ (var-get total-supply) amount)))
      (var-set total-supply new-supply)
      (map-set balances recipient (+ (unwrap-panic (get-balance recipient)) amount))

      (print { topic: "ft_mint_event", value: { asset_identifier: (as-contract tx-sender), recipient: recipient, amount: amount } })
      (ok true)
    )
  )
)

;; Burn tokens (only callable by the token holder)
(define-public (burn (amount uint) (owner principal))
  (begin
    (asserts! (is-eq tx-sender owner) err-not-token-owner)
    (asserts! (> amount u0) err-amount-zero)

    (let ((owner-balance (get-balance owner)))
        (asserts! (>= (unwrap-panic owner-balance) amount) err-insufficient-balance)

        (let ((new-supply (- (var-get total-supply) amount)))
            (var-set total-supply new-supply)
            (map-set balances owner (- (unwrap-panic owner-balance) amount))

            (print { topic: "ft_burn_event", value: { asset_identifier: (as-contract tx-sender), owner: owner, amount: amount } })
            (ok true)
        )
    )
  )
)

;; Set token URI (only callable by contract owner)
(define-public (set-token-uri (value (optional (string-utf8 256))))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (var-set token-uri value)
    (ok true)
  )
) 