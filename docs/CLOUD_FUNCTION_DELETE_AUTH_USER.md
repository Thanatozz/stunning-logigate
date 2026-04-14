# Cloud Function para borrar usuarios en Firebase Authentication

El dashboard no puede borrar cuentas de otros usuarios en Firebase Auth directamente desde frontend.
Para eso necesitas un backend admin (Cloud Function + Admin SDK).

## 1) Funcion (Node.js, Functions v2)

```js
const { onRequest } = require('firebase-functions/v2/https')
const admin = require('firebase-admin')

admin.initializeApp()

exports.deleteAuthUserByAdmin = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' })
    return
  }

  try {
    const authHeader = String(req.headers.authorization || '')
    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'missing_bearer_token' })
      return
    }

    const idToken = authHeader.slice(7)
    const decoded = await admin.auth().verifyIdToken(idToken, true)

    const uid = String(req.body?.uid || '').trim()
    if (!uid) {
      res.status(400).json({ error: 'missing_uid' })
      return
    }

    const hasClaimAdmin = decoded.admin === true || decoded.role === 'admin'
    let hasDbAdminRole = false

    if (!hasClaimAdmin) {
      const roleSnap = await admin.database().ref(`users/${decoded.uid}/role`).get()
      hasDbAdminRole = roleSnap.val() === 'admin'
    }

    if (!hasClaimAdmin && !hasDbAdminRole) {
      res.status(403).json({ error: 'forbidden_admin_required' })
      return
    }

    await admin.auth().deleteUser(uid)
    res.status(200).json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error'
    res.status(500).json({ error: 'delete_auth_user_failed', reason: message })
  }
})
```

## 2) Deploy rapido

```bash
firebase init functions
firebase deploy --only functions:deleteAuthUserByAdmin
```

## 3) Configurar dashboard

En `dashboard/.env`:

```env
VITE_AUTH_ADMIN_DELETE_URL=https://<REGION>-<PROJECT_ID>.cloudfunctions.net/deleteAuthUserByAdmin
```

Luego reinicia el frontend.

## 4) Resultado esperado

- Al borrar usuario desde dashboard:
  - se elimina en `RTDB /users/{uid}`
  - se llama a la Cloud Function
  - se elimina en Firebase Authentication

Si la function no esta configurada, el dashboard mostrara aviso de eliminacion parcial (solo DB).
