package data

import api.AuthService
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import model.Resource
import model.User

class UserRepository(private val authService: AuthService) {
    fun login(email: String, password: String): Flow<Resource<User>> = flow {
        emit(Resource.Loading())
        try {
            val response = authService.login(email, password)

            if (!response.error) {
                requireNotNull(response.data)
                emit(Resource.Success(response.data))
            } else {
                emit(Resource.Error(response.message!!))
            }
        } catch (e: Exception) {
            emit(Resource.Error(e.localizedMessage, null))
        }
    }

    companion object {
        @Volatile private var instance: UserRepository? = null

        fun getInstance(authService: AuthService) =
            instance ?: synchronized(this) {
                instance ?: UserRepository(authService).also { instance = it }
            }
    }
}