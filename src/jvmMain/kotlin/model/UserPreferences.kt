package model

import kotlinx.serialization.Serializable

@Serializable
data class UserPreferences(val user: User?, val notifications: String? = null)