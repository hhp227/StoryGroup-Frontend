package helper

import androidx.datastore.core.DataStore
import androidx.datastore.core.DataStoreFactory
import kotlinx.coroutines.flow.*
import model.User
import model.UserPreferences
import java.io.File
import java.io.IOException

class PreferenceManager private constructor() {
    private val dataStore: DataStore<UserPreferences> = DataStoreFactory.create(
        serializer = UserPreferencesSerializer,
        produceFile = { file }
    )

    private val userPreferences: Flow<UserPreferences>
        get() = dataStore.data.catch { e ->
            if (e is IOException) {
                println("Error reading preference. $e")
                emit(UserPreferences(null))
            } else {
                throw e
            }
        }

    val userFlow: Flow<User?>
        get() = userPreferences.map { it.user }

    val notificationsFlow: Flow<String?>
        get() = userPreferences.map { it.notifications }

    suspend fun storeUser(user: User?) {
        if (file.exists()) file.delete()
        dataStore.updateData { it.copy(user) }
    }

    suspend fun addNotification(notification: String) {
        dataStore.updateData {
            var oldNotifications = it.notifications
            if (oldNotifications != null) oldNotifications += "|$notification" else oldNotifications = notification
            it.copy(notifications = oldNotifications)
        }
    }

    suspend fun fetchInitialPreferences() = dataStore.data.first()

    companion object {
        private val TAG = PreferenceManager::class.java.simpleName

        val file = File("user-preference.json")

        @Volatile
        private var instance: PreferenceManager? = null

        fun getInstance() =
            instance ?: synchronized(this) {
                instance ?: PreferenceManager().also { instance = it }
            }
    }
}